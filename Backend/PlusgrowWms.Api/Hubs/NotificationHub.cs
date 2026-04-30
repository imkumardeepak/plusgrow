using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PlusgrowWms.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
}
