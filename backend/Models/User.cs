namespace backend.Models;

public enum UserRole { Dispatcher, Engineer }

public sealed record User(int Id, string FullName, UserRole Role);
