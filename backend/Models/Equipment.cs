namespace backend.Models;

public sealed class Equipment
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ClientId { get; set; }
}
