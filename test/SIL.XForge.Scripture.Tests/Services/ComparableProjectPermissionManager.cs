using System;
using Paratext.Data;
using Paratext.Data.Users;
using PtxUtils;

namespace SIL.XForge.Scripture.Services
{
    /// <summary>
    /// This is an implementation of the ProjectPermissionManager that allows comparison of permission managers.
    /// </summary>
    /// <seealso cref="ProjectPermissionManager" />
    /// <seealso cref="IEquatable{ComparableProjectPermissionManager}" />
    public class ComparableProjectPermissionManager
        : ProjectPermissionManager, IEquatable<ComparableProjectPermissionManager>
    {
        public ComparableProjectPermissionManager(ScrText scrText)
            : base(scrText)
        {
        }

        /// <summary>
        /// Gets the XML data.
        /// </summary>
        /// <remarks>
        /// This is based on the code for <see cref="PermissionManager.Clone" />.
        /// </remarks>
        private string XmlData => Memento.ToXmlString(Data, false, true);

        public bool Equals(ComparableProjectPermissionManager other)
            => this.XmlData == other?.XmlData;
    }
}
