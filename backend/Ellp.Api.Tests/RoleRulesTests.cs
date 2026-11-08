using Ellp.Api.Shared;
using Ellp.Api.Shared.Auth;

namespace Ellp.Api.Tests;

/// <summary>Who may touch which tenant and hand out which role.</summary>
public class RoleRulesTests
{
    private static UserProfile U(Role r, string? owner) => new() { Uid = r.ToString(), Role = r, OwnerId = owner };

    [Fact]
    public void Staff_is_everyone_but_learners()
    {
        Assert.True(RoleRules.IsStaff(U(Role.superadmin, null)));
        Assert.True(RoleRules.IsStaff(U(Role.owner, "a")));
        Assert.True(RoleRules.IsStaff(U(Role.admin, "a")));
        Assert.False(RoleRules.IsStaff(U(Role.learner, "a")));
    }

    [Fact]
    public void The_super_admin_manages_any_tenant_staff_only_their_own()
    {
        Assert.True(RoleRules.CanManageOwner(U(Role.superadmin, null), "a"));
        Assert.True(RoleRules.CanManageOwner(U(Role.superadmin, null), null));
        Assert.True(RoleRules.CanManageOwner(U(Role.owner, "a"), "a"));
        Assert.False(RoleRules.CanManageOwner(U(Role.owner, "a"), "b"));
        Assert.True(RoleRules.CanManageOwner(U(Role.admin, "a"), "a"));
        Assert.False(RoleRules.CanManageOwner(U(Role.admin, "a"), null));
        Assert.False(RoleRules.CanManageOwner(U(Role.learner, "a"), "a"));
    }

    [Fact]
    public void Roles_are_handed_down_not_up()
    {
        Assert.True(RoleRules.CanAssignRole(U(Role.superadmin, null), Role.superadmin));
        Assert.True(RoleRules.CanAssignRole(U(Role.owner, "a"), Role.admin));
        Assert.True(RoleRules.CanAssignRole(U(Role.owner, "a"), Role.owner));
        Assert.False(RoleRules.CanAssignRole(U(Role.owner, "a"), Role.superadmin));
        Assert.True(RoleRules.CanAssignRole(U(Role.admin, "a"), Role.learner));
        Assert.False(RoleRules.CanAssignRole(U(Role.admin, "a"), Role.admin));
        Assert.False(RoleRules.CanAssignRole(U(Role.learner, "a"), Role.learner));
    }
}
