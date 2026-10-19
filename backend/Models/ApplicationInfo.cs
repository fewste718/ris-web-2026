namespace backend.Models;

public sealed record ApplicationInfo(
    string Name,
    string Environment,
    string Version,
    string Lab);
