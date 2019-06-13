using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Humanizer;
using Microsoft.AspNetCore.NodeServices;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using MongoDB.Driver;
using SIL.ObjectModel;
using SIL.XForge.Configuration;
using SIL.XForge.Models;
using SIL.XForge.Utils;

namespace SIL.XForge.Realtime
{
    /// <summary>
    /// This service is responsible for managing the real-time/ShareDB server. It provides methods for accessing
    /// real-time data and performing actions on the server.
    /// </summary>
    public class RealtimeService : DisposableBase, IRealtimeService
    {
        private readonly INodeServices _nodeServices;
        private readonly IOptions<SiteOptions> _siteOptions;
        private readonly IOptions<DataAccessOptions> _dataAccessOptions;
        private readonly IOptions<RealtimeOptions> _realtimeOptions;
        private readonly IOptions<AuthOptions> _authOptions;
        private readonly IMongoDatabase _database;
        private readonly string _modulePath;
        private bool _started;

        public RealtimeService(INodeServices nodeServices, IOptions<SiteOptions> siteOptions,
            IOptions<DataAccessOptions> dataAccessOptions, IOptions<RealtimeOptions> realtimeOptions,
            IOptions<AuthOptions> authOptions, IMongoClient mongoClient)
        {
            _nodeServices = nodeServices;
            _siteOptions = siteOptions;
            _dataAccessOptions = dataAccessOptions;
            _realtimeOptions = realtimeOptions;
            _authOptions = authOptions;
            _database = mongoClient.GetDatabase(_dataAccessOptions.Value.MongoDatabaseName);
            _modulePath = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "Realtime",
                "realtime-server");
        }

        public void StartServer()
        {
            if (_started)
                return;

            object options = CreateOptions();
            InvokeExportAsync<object>("start", options).GetAwaiter().GetResult();
            _started = true;
        }

        public void StopServer()
        {
            if (!_started)
                return;

            InvokeExportAsync<object>("stop").GetAwaiter().GetResult();
            _started = false;
        }


        public async Task<IConnection> ConnectAsync()
        {
            var conn = new Connection(this);
            try
            {
                await conn.StartAsync();
                return conn;
            }
            catch (Exception)
            {
                conn.Dispose();
                throw;
            }
        }

        public string GetCollectionName(string type)
        {
            string collection = type.Singularize().Underscore() + "_data";
            if (type == RootDataTypes.Projects)
                collection = _dataAccessOptions.Value.Prefix + "_" + collection;
            return collection;
        }

        public async Task DeleteProjectDocsAsync(string type, string projectId)
        {
            string collectionName = GetCollectionName(type);

            IMongoCollection<BsonDocument> snapshotCollection = _database.GetCollection<BsonDocument>(collectionName);
            FilterDefinition<BsonDocument> idFilter = Builders<BsonDocument>.Filter.Regex("_id", $"^{projectId}");
            await snapshotCollection.DeleteManyAsync(idFilter);

            IMongoCollection<BsonDocument> opsCollection = _database.GetCollection<BsonDocument>("o_" + collectionName);
            FilterDefinition<BsonDocument> dFilter = Builders<BsonDocument>.Filter.Regex("d", $"^{projectId}");
            await opsCollection.DeleteManyAsync(dFilter);
        }

        internal Task<T> InvokeExportAsync<T>(string exportedFunctionName, params object[] args)
        {
            return _nodeServices.InvokeExportAsync<T>(_modulePath, exportedFunctionName, args);
        }

        internal string GetOTTypeName(string type)
        {
            RealtimeDocConfig docConfig = _realtimeOptions.Value.Docs.First(dc => dc.Type == type);
            return docConfig.OTTypeName;
        }

        protected override void DisposeManagedResources()
        {
            StopServer();
        }

        private object CreateOptions()
        {
            string mongo = $"{_dataAccessOptions.Value.ConnectionString}/{_dataAccessOptions.Value.MongoDatabaseName}";
            return new
            {
                ConnectionString = mongo,
                Port = _realtimeOptions.Value.Port,
                Authority = $"https://{_authOptions.Value.Domain}/",
                ProjectsCollectionName =
                    $"{_dataAccessOptions.Value.Prefix}_{RootDataTypes.Projects.Underscore()}",
                ProjectRoles = CreateProjectRoles(_realtimeOptions.Value.ProjectRoles),
                Collections = _realtimeOptions.Value.Docs.Select(c => CreateCollectionConfig(c)).ToArray(),
                Audience = _authOptions.Value.Audience,
                Scope = _authOptions.Value.Scope
            };
        }

        private static object CreateProjectRoles(ProjectRoles projectRoles)
        {
            return projectRoles.Rights.Select(kvp => new
            {
                Name = kvp.Key,
                Rights = kvp.Value.Select(r => r.Domain + (int)r.Operation).ToArray()
            }).ToArray();
        }

        private object CreateCollectionConfig(RealtimeDocConfig docConfig)
        {
            return new
            {
                Name = GetCollectionName(docConfig.Type),
                OTTypeName = docConfig.OTTypeName,
                Models = docConfig.Models
                    .OrderByDescending(t => t.Path.Count)
                    .Select(t => new { Domain = t.Domain, Path = t.Path.Select(s => s.ToCamelCase()).ToArray() })
                    .ToArray()
            };
        }
    }
}
