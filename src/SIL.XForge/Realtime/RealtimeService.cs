using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Humanizer;
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
        private readonly IOptions<SiteOptions> _siteOptions;
        private readonly IOptions<DataAccessOptions> _dataAccessOptions;
        private readonly IOptions<RealtimeOptions> _realtimeOptions;
        private readonly IOptions<AuthOptions> _authOptions;
        private readonly IMongoDatabase _database;

        public RealtimeService(RealtimeServer server, IOptions<SiteOptions> siteOptions,
            IOptions<DataAccessOptions> dataAccessOptions, IOptions<RealtimeOptions> realtimeOptions,
            IOptions<AuthOptions> authOptions, IMongoClient mongoClient)
        {
            Server = server;
            _siteOptions = siteOptions;
            _dataAccessOptions = dataAccessOptions;
            _realtimeOptions = realtimeOptions;
            _authOptions = authOptions;
            _database = mongoClient.GetDatabase(_dataAccessOptions.Value.MongoDatabaseName);
        }

        internal RealtimeServer Server { get; }

        public void StartServer()
        {
            object options = CreateOptions();
            Server.Start(options);
        }

        public void StopServer()
        {
            Server.Stop();
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
            if (type == RootDataTypes.Projects)
                return $"{_dataAccessOptions.Value.Prefix}_{type.Underscore()}";
            return type.Underscore();
        }

        public async Task DeleteProjectAsync(string projectId)
        {
            var tasks = new List<Task>();
            foreach (DocConfig docConfig in _realtimeOptions.Value.ProjectDataDocs)
                tasks.Add(DeleteProjectDocsAsync(docConfig.Type, projectId));
            await Task.WhenAll(tasks);

            string collectionName = GetCollectionName(RootDataTypes.Projects);

            IMongoCollection<BsonDocument> snapshotCollection = _database.GetCollection<BsonDocument>(collectionName);
            FilterDefinition<BsonDocument> idFilter = Builders<BsonDocument>.Filter.Regex("_id", projectId);
            await snapshotCollection.DeleteManyAsync(idFilter);

            IMongoCollection<BsonDocument> opsCollection = _database.GetCollection<BsonDocument>("o_" + collectionName);
            FilterDefinition<BsonDocument> dFilter = Builders<BsonDocument>.Filter.Regex("d", projectId);
            await opsCollection.DeleteManyAsync(dFilter);
        }

        public IQueryable<T> QuerySnapshots<T>(string type) where T : IIdentifiable
        {
            string collectionName = GetCollectionName(type);
            IMongoCollection<T> collection = _database.GetCollection<T>(collectionName);
            return collection.AsQueryable();
        }

        internal string GetOTTypeName(string type)
        {
            switch (type)
            {
                case RootDataTypes.Users:
                case RootDataTypes.Projects:
                    return OTType.Json0;

                default:
                    DocConfig docConfig = _realtimeOptions.Value.ProjectDataDocs.First(dc => dc.Type == type);
                    return docConfig.OTTypeName;
            }
        }

        protected override void DisposeManagedResources()
        {
            StopServer();
        }

        private async Task DeleteProjectDocsAsync(string type, string projectId)
        {
            string collectionName = GetCollectionName(type);

            IMongoCollection<BsonDocument> snapshotCollection = _database.GetCollection<BsonDocument>(collectionName);
            FilterDefinition<BsonDocument> idFilter = Builders<BsonDocument>.Filter.Regex("_id", $"^{projectId}");
            await snapshotCollection.DeleteManyAsync(idFilter);

            IMongoCollection<BsonDocument> opsCollection = _database.GetCollection<BsonDocument>("o_" + collectionName);
            FilterDefinition<BsonDocument> dFilter = Builders<BsonDocument>.Filter.Regex("d", $"^{projectId}");
            await opsCollection.DeleteManyAsync(dFilter);
        }

        private object CreateOptions()
        {
            string mongo = $"{_dataAccessOptions.Value.ConnectionString}/{_dataAccessOptions.Value.MongoDatabaseName}";
            return new
            {
                ConnectionString = mongo,
                Port = _realtimeOptions.Value.Port,
                Authority = $"https://{_authOptions.Value.Domain}/",
                UsersCollection = CreateCollectionConfig(_realtimeOptions.Value.UserDoc),
                ProjectsCollection = CreateCollectionConfig(_realtimeOptions.Value.ProjectDoc),
                UserProfilesCollectionName = GetCollectionName(RootDataTypes.UserProfiles),
                ProjectRoles = CreateProjectRoles(_realtimeOptions.Value.ProjectRoles),
                ProjectAdminRole = _realtimeOptions.Value.ProjectRoles.AdminRole,
                ProjectDataCollections = _realtimeOptions.Value.ProjectDataDocs
                    .Select(c => CreateCollectionConfig(c)).ToArray(),
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

        private object CreateCollectionConfig(DocConfig docConfig)
        {
            return new
            {
                Name = GetCollectionName(docConfig.Type),
                OTTypeName = docConfig.OTTypeName,
                Domains = docConfig.Domains
                    .OrderByDescending(d => d.PathTemplate?.Template?.Items?.Count ?? 0)
                    .Select(d => new { Domain = d.Domain, PathTemplate = CreatePathTemplateConfig(d.PathTemplate) })
                    .ToArray(),
                ImmutableProps = docConfig.ImmutableProperties
                    .Select(ip => CreatePathTemplateConfig(ip))
                    .ToArray()
            };
        }

        private static object CreatePathTemplateConfig(PathTemplateConfig pathTemplateConfig)
        {
            if (pathTemplateConfig == null)
                return new { Template = new object[0], Inherit = true };
            return new
            {
                Template = pathTemplateConfig.Template.Items.Select(i => (i is string str) ? str.ToCamelCase() : i)
                    .ToArray(),
                Inherit = pathTemplateConfig.Inherit
            };
        }
    }
}
