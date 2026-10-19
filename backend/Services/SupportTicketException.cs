namespace backend.Services;

public sealed class SupportTicketException : Exception
{
    public int StatusCode { get; }

    public SupportTicketException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}
