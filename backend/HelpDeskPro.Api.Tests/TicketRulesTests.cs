using Xunit;
using HelpDeskPro.Api.Models;
using HelpDeskPro.Api.Services;
namespace HelpDeskPro.Api.Tests;
public class TicketRulesTests
{
 [Fact] public void CriticalSlaIsFourHours()=>Assert.Equal(4,TicketRules.SlaHours(Priority.Critical));
 [Fact] public void HighSlaIsEightHours()=>Assert.Equal(8,TicketRules.SlaHours(Priority.High));
 [Theory]
 [InlineData(TicketStatus.Open,TicketStatus.InProgress)]
 [InlineData(TicketStatus.InProgress,TicketStatus.Pending)]
 [InlineData(TicketStatus.InProgress,TicketStatus.Resolved)]
 [InlineData(TicketStatus.Resolved,TicketStatus.Closed)]
 [InlineData(TicketStatus.Closed,TicketStatus.InProgress)]
 public void ValidTransitionsAreAccepted(TicketStatus from,TicketStatus to)=>Assert.True(TicketRules.IsValidTransition(from,to));
 [Fact] public void InvalidTransitionIsRejected()=>Assert.False(TicketRules.IsValidTransition(TicketStatus.Open,TicketStatus.Closed));
 [Theory]
 [InlineData(TicketStatus.Resolved,TicketStatus.InProgress)]
 [InlineData(TicketStatus.Closed,TicketStatus.InProgress)]
 public void ReopenTransitionsAreAccepted(TicketStatus from,TicketStatus to)=>Assert.True(TicketRules.IsValidTransition(from,to));

 [Fact]
 public void Cannot_skip_workflow()
 {
     Assert.False(TicketRules.IsValidTransition(TicketStatus.Open, TicketStatus.Resolved));
     Assert.False(TicketRules.IsValidTransition(TicketStatus.Open, TicketStatus.Closed));
     Assert.False(TicketRules.IsValidTransition(TicketStatus.Pending, TicketStatus.Closed));
 }

 [Fact]
 public void Reopen_paths_are_allowed()
 {
     Assert.True(TicketRules.IsValidTransition(TicketStatus.Resolved, TicketStatus.InProgress));
     Assert.True(TicketRules.IsValidTransition(TicketStatus.Closed, TicketStatus.InProgress));
 }
}
