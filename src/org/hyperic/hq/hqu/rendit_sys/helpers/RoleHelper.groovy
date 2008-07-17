package org.hyperic.hq.hqu.rendit.helpers

import org.hyperic.hq.authz.server.session.RoleManagerEJBImpl as RoleMan
import org.hyperic.hq.authz.server.session.AuthzSubject
import org.hyperic.hq.authz.server.session.Role
import org.hyperic.hq.authz.shared.RoleValue
import org.hyperic.hq.authz.server.session.Operation
import org.hyperic.hq.authz.shared.OperationValue

class RoleHelper extends BaseHelper {

    def roleMan = RoleMan.one

    RoleHelper(AuthzSubject user, int sessionId) {
        super(user, sessionId)
    }

    /**
     * Find all Roles
     *
     * @return A Collection of Roles in the system.
     */
    public Collection getAllRoles() {
        roleMan.allRoles
    }

    /**
     * Find a Role by name.
     * @param name The role name to search for.
     * @return The Role with the given name, or null if that role does not
     * exist.
     */
    public Role findRoleByName(String name) {
        roleMan.findRoleByName(name)
    }

    /**
     * Find a Role by id.
     * @param id The role id to search for.
     * @return The Role with the given id, or null if that role does not exist.
     */
    public Role getRoleById(int id) {
        roleMan.getRoleById(id)
    }

    /**
     * Return a map of Operation name to Operation
     */
    private Map makeOpNameToOpMap() {
        def res = [:]
        roleMan.findAllOperations().each {op ->
            res[op.name] = op.operationValue
        }
        res
    }

    /**
     * Create a Role.
     */
    public Role createRole(String roleName, String roleDescription,
                           String[] operations,
                           Integer[] subjectIds, Integer[] groupIds) {

        def role = [name: roleName,
                    description: roleDescription,
                    system: false] as RoleValue

        def allOps = makeOpNameToOpMap()
        def ops = []
        operations.each {operation ->
            ops += allOps[operation]
        }

        Integer roleId = roleMan.createOwnedRole(userValue, role, ops as OperationValue[],
                                                 subjectIds, groupIds)
        getRoleById(roleId)
    }

    /**
     * Delete a Role
     */
    public void deleteRole(int roldId) {
        roleMan.removeRole(userValue, new Integer(roleId))
    }
}
