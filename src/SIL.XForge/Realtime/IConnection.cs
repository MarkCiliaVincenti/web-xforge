using System;
using SIL.XForge.Models;

namespace SIL.XForge.Realtime
{
    public interface IConnection : IDisposable
    {
        IDocument<T> Get<T>(string type, string id) where T : IIdentifiable;
    }
}
