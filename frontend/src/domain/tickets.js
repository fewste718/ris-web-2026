export const ticketStatuses = [
  { value: 'New', label: 'Новая' },
  { value: 'InProgress', label: 'В работе' },
  { value: 'Closed', label: 'Выполнена' },
  { value: 'Cancelled', label: 'Отменена' },
]

export const statusLabel = (status) => ticketStatuses.find((item) => item.value === status)?.label ?? status

export function ticketActions(ticket, user) {
  const dispatcher = user?.role === 'Dispatcher'
  const ownEngineer = user?.role === 'Engineer' && ticket.assigneeUserId === user.id
  return {
    assign: dispatcher && ticket.status === 'New',
    cancel: dispatcher && ['New', 'InProgress'].includes(ticket.status),
    start: ownEngineer && ticket.status === 'New',
    close: ownEngineer && ticket.status === 'InProgress',
  }
}
