import org.hyperic.hq.authz.shared.PermissionManagerFactory
import org.hyperic.hq.authz.shared.PermissionException
import org.hyperic.hq.authz.shared.AuthzConstants
import org.hyperic.hq.hqu.rendit.BaseController

class SummaryController
    extends BaseController {

    /**
     * Get the custom properties for a resource
     * key = Cprop description
     * value = Cprop value
     */
    private getCustomProperties(resource) {
        def config = resource.config
        def props = [:]

        config.each { k, v ->
            if (v.type.equals("cprop")) {
                props[v.description] = v.value
            }
        }
        props
    }
 
    private boolean hasPlatformPermission(instanceId) {
        try {
            PermissionManagerFactory.getInstance().check(user.getId(), 
                                                     AuthzConstants.platformResType, 
                                                     instanceId,
                                                     AuthzConstants.platformOpViewPlatform)
        } catch(PermissionException e) {
            return false
        }
        
        return true
    }

    def index(params) {
        def id = params.getOne('id')?.toInteger()

        if (!id) {  
            render(inline: "No resource selected")
            
            return
        }

        def resource = resourceHelper.findById(id)
        def ancestors = resourceHelper.findAncestorsByVirtualRelation(resource)
        def host = null, hostProps = null, 
            vm = null, vmProps = null, associatedPlatform = null,
            server = null, serverProps = null

        if (resource.prototype.name == AuthzConstants.serverPrototypeVmwareVcenter) {
            // TODO
        } else if (resource.prototype.name == AuthzConstants.platformPrototypeVmwareVsphereHost) {
            host = resource
            hostProps = getCustomProperties(resource)
        } else if (resource.prototype.name == AuthzConstants.platformPrototypeVmwareVsphereVm) {
            vm = resource
            vmProps = getCustomProperties(resource)
            
            def children = resourceHelper.findChildResourcesByVirtualRelation(resource)
            def platform = children.find({ res -> res.resourceType.id == AuthzConstants.authzPlatform })
                
            if (platform && hasPlatformPermission(platform.getInstanceId())) {
                associatedPlatform = platform
            }
        } else if (resource.resourceType.id == AuthzConstants.authzServer){
            server = resource
            serverProps = getCustomProperties(resource)
        }
            
        ancestors.each { res ->
            if (res.prototype.name == AuthzConstants.serverPrototypeVmwareVcenter) {
                // TODO
            } else if (res.prototype.name == AuthzConstants.platformPrototypeVmwareVsphereHost) {
                host = res
                hostProps = getCustomProperties(res)
            } else if (res.prototype.name == AuthzConstants.platformPrototypeVmwareVsphereVm) {
                vm = res
                vmProps = getCustomProperties(res)
                
                def children = resourceHelper.findChildResourcesByVirtualRelation(resource)
                def platform = children.find({ r -> r.resourceType.id == AuthzConstants.authzPlatform })
                
                if (platform && hasPlatformPermission(platform.getInstanceId())) {
                    associatedPlatform = platform
                }
            }
        }
        
        render(locals:[ host : host,
                        hostProps : hostProps,
                        vm : vm,
                        vmProps : vmProps,
                        associatedPlatform: associatedPlatform,
                        resource : server,
                        resourceProps : serverProps])
    }
}