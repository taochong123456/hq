/*
 * Generated by XDoclet - Do not edit!
 */
package org.hyperic.hq.bizapp.shared;

import org.hyperic.hq.appdef.shared.AgentNotFoundException;
import org.hyperic.hq.appdef.shared.AppdefEntityID;
import org.hyperic.hq.appdef.shared.AppdefEntityNotFoundException;
import org.hyperic.hq.auth.shared.SessionNotFoundException;
import org.hyperic.hq.auth.shared.SessionTimeoutException;
import org.hyperic.hq.authz.shared.PermissionException;
import org.hyperic.hq.livedata.shared.LiveDataCommand;
import org.hyperic.hq.livedata.shared.LiveDataException;
import org.hyperic.hq.livedata.shared.LiveDataResult;
import org.hyperic.hq.product.PluginException;
import org.hyperic.util.config.ConfigSchema;

/**
 * Local interface for LiveDataBoss.
 */
public interface LiveDataBoss {
   /**
    * Get live data for a given resource
    */
   public LiveDataResult getLiveData( int sessionId,LiveDataCommand command ) throws PermissionException, AgentNotFoundException, AppdefEntityNotFoundException, LiveDataException, SessionTimeoutException, SessionNotFoundException;

   /**
    * Get live data for the given commands
    */
   public LiveDataResult[] getLiveData( int sessionId,LiveDataCommand[] commands ) throws PermissionException, AgentNotFoundException, AppdefEntityNotFoundException, LiveDataException, SessionTimeoutException, SessionNotFoundException;

   /**
    * Get the commands for a given resource.
    */
   public String[] getLiveDataCommands( int sessionId,AppdefEntityID id ) throws PluginException, PermissionException, SessionTimeoutException, SessionNotFoundException;

   /**
    * Get the ConfigSchema for this resource
    */
   public ConfigSchema getConfigSchema( int sessionId,AppdefEntityID id,String command ) throws PluginException, PermissionException, SessionTimeoutException, SessionNotFoundException;

}
