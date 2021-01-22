using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using MongoDB.Bson;
using MongoDB.Driver;
using SIL.ObjectModel;
using SIL.XForge.Configuration;
using SIL.XForge.Models;

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
        private readonly Dictionary<Type, DocConfig> _docConfigs;
        private readonly IConfiguration _configuration;

        public RealtimeService(IRealtimeServer server, IOptions<SiteOptions> siteOptions,
            IOptions<DataAccessOptions> dataAccessOptions, IOptions<RealtimeOptions> realtimeOptions,
            IOptions<AuthOptions> authOptions, IMongoClient mongoClient, IConfiguration configuration)
        {
            Server = server;
            _siteOptions = siteOptions;
            _dataAccessOptions = dataAccessOptions;
            _realtimeOptions = realtimeOptions;
            _authOptions = authOptions;
            _database = mongoClient.GetDatabase(_dataAccessOptions.Value.MongoDatabaseName);
            _configuration = configuration;

            RealtimeOptions options = _realtimeOptions.Value;
            _docConfigs = new Dictionary<Type, DocConfig>();
            AddDocConfig(options.UserDoc);
            AddDocConfig(options.ProjectDoc);
            foreach (DocConfig projectDataDoc in options.ProjectDataDocs)
            {
                AddDocConfig(projectDataDoc);
            }
            foreach (DocConfig userDataDoc in options.UserDataDocs)
            {
                AddDocConfig(userDataDoc);
            }
        }

        internal IRealtimeServer Server { get; }

        public void StartServer()
        {
            object options = CreateOptions();
            Server.Start(options);
        }

        public void StopServer()
        {
            Server.Stop();
        }

        public async Task<IConnection> ConnectAsync(string userId = null)
        {
            var conn = new Connection(this);
            try
            {
                await conn.StartAsync(userId);
                return conn;
            }
            catch (Exception)
            {
                conn.Dispose();
                throw;
            }
        }

        public string GetCollectionName<T>() where T : IIdentifiable
        {
            DocConfig docConfig = GetDocConfig<T>();
            return docConfig.CollectionName;
        }

        /// <summary>
        /// Delete project-related docs from various collections.
        /// </summary>
        public async Task DeleteProjectAsync(string projectId)
        {
            if (string.IsNullOrEmpty(projectId))
            {
                throw new ArgumentException("", nameof(projectId));
            }

            RealtimeOptions options = _realtimeOptions.Value;
            var tasks = new List<Task>();
            foreach (DocConfig docConfig in options.ProjectDataDocs)
                tasks.Add(DeleteProjectDocsAsync(docConfig.CollectionName, projectId));
            await Task.WhenAll(tasks);

            IMongoCollection<BsonDocument> snapshotCollection = _database.GetCollection<BsonDocument>(
                options.ProjectDoc.CollectionName);
            FilterDefinition<BsonDocument> idFilter = Builders<BsonDocument>.Filter.Eq("_id", projectId);
            await snapshotCollection.DeleteManyAsync(idFilter);

            IMongoCollection<BsonDocument> opsCollection = _database.GetCollection<BsonDocument>(
                $"o_{options.ProjectDoc.CollectionName}");
            FilterDefinition<BsonDocument> dFilter = Builders<BsonDocument>.Filter.Eq("d", projectId);
            await opsCollection.DeleteManyAsync(dFilter);
        }

        /// <summary>
        /// Delete user-related docs from various collections.
        /// </summary>
        public async Task DeleteUserAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                throw new ArgumentException("", nameof(userId));
            }

            RealtimeOptions options = _realtimeOptions.Value;
            IEnumerable<DocConfig> collectionsToProcess = options.UserDataDocs.Append(options.UserDoc);
            FilterDefinition<BsonDocument> idFilter = Builders<BsonDocument>.Filter.Regex("_id", $"{userId}$");
            FilterDefinition<BsonDocument> dFilter = Builders<BsonDocument>.Filter.Regex("d", $"{userId}$");
            foreach (var collection in collectionsToProcess)
            {
                IMongoCollection<BsonDocument> snapshotCollection = _database.GetCollection<BsonDocument>(
                    collection.CollectionName);
                await snapshotCollection.DeleteManyAsync(idFilter);

                IMongoCollection<BsonDocument> opsCollection = _database.GetCollection<BsonDocument>(
                $"o_{collection.CollectionName}");
                await opsCollection.DeleteManyAsync(dFilter);
            }
        }

        public IQueryable<T> QuerySnapshots<T>() where T : IIdentifiable
        {
            string collectionName = GetCollectionName<T>();
            IMongoCollection<T> collection = _database.GetCollection<T>(collectionName);
            return collection.AsQueryable();
        }

        internal DocConfig GetDocConfig<T>() where T : IIdentifiable
        {
            return _docConfigs[typeof(T)];
        }

        protected override void DisposeManagedResources()
        {
            StopServer();
        }

        private void AddDocConfig(DocConfig docConfig)
        {
            _docConfigs[docConfig.Type] = docConfig;
        }

        private async Task DeleteProjectDocsAsync(string collectionName, string projectId)
        {
            IMongoCollection<BsonDocument> snapshotCollection = _database.GetCollection<BsonDocument>(collectionName);
            FilterDefinition<BsonDocument> idFilter = Builders<BsonDocument>.Filter.Regex("_id", $"^{projectId}");
            await snapshotCollection.DeleteManyAsync(idFilter);

            IMongoCollection<BsonDocument> opsCollection = _database.GetCollection<BsonDocument>($"o_{collectionName}");
            FilterDefinition<BsonDocument> dFilter = Builders<BsonDocument>.Filter.Regex("d", $"^{projectId}");
            await opsCollection.DeleteManyAsync(dFilter);
        }

        private object CreateOptions()
        {
            string mongo = $"{_dataAccessOptions.Value.ConnectionString}/{_dataAccessOptions.Value.MongoDatabaseName}";
            return new
            {
                AppModuleName = _realtimeOptions.Value.AppModuleName,
                ConnectionString = mongo,
                Port = _realtimeOptions.Value.Port,
                Authority = $"https://{_authOptions.Value.Domain}/",
                Audience = _authOptions.Value.Audience,
                Scope = _authOptions.Value.Scope,
                BugsnagApiKey = this._configuration.GetValue<string>("Bugsnag:ApiKey"),
                ReleaseStage = this._configuration.GetValue<string>("Bugsnag:ReleaseStage"),
                MigrationsDisabled = this._realtimeOptions.Value.MigrationsDisabled,
                SiteId = this._siteOptions.Value.Id,
                Version = System.Diagnostics.FileVersionInfo.GetVersionInfo(
                    @System.Reflection.Assembly.GetEntryAssembly().Location).ProductVersion
            };
        }
    }
}
