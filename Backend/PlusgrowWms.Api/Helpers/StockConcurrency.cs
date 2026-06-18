using Microsoft.EntityFrameworkCore;
using PlusgrowWms.Api.Data;

namespace PlusgrowWms.Api.Helpers;

/// <summary>
/// Helpers for serializing concurrent stock mutations on the same product.
///
/// All stock operations (pick, put-away, move, adjust) read the current quantity / location
/// map and then write the new value. Without serialization two concurrent operations on the
/// same product can both pass their availability check and the last write wins (lost update ->
/// overselling / negative stock). Acquiring a row lock on the product row inside a transaction
/// forces those operations to run one after another for a given product.
/// </summary>
public static class StockConcurrency
{
    /// <summary>
    /// Takes a PostgreSQL row-level lock (<c>SELECT ... FOR UPDATE</c>) on the product row.
    /// Must be called inside an active database transaction. The lock is held until the
    /// transaction commits or rolls back, serializing all stock operations for the product.
    /// </summary>
    public static Task LockProductAsync(this PlusgrowDbContext context, int productId)
    {
        return context.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM products WHERE id = {productId} FOR UPDATE");
    }

    /// <summary>
    /// Locks multiple product rows in ascending id order to avoid deadlocks between
    /// concurrent multi-product operations (e.g. bulk direct pick).
    /// </summary>
    public static async Task LockProductsAsync(this PlusgrowDbContext context, IEnumerable<int> productIds)
    {
        foreach (var productId in productIds.Distinct().OrderBy(id => id))
        {
            await context.LockProductAsync(productId);
        }
    }
}
