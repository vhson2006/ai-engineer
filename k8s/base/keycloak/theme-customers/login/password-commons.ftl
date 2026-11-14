<#-- Copy of keycloak.v2/login/password-commons.ftl (Keycloak 26.4.7) with ONE change: value=true,
     "sign out other devices" checked by default when a customer sets a new password (ADR 0050).
     On a Keycloak upgrade, compare with the new version of that file. -->
<#import "field.ftl" as field>
<#macro logoutOtherSessions>
    <div id="kc-form-options" class="${properties.kcFormOptionsClass!}">
        <div class="${properties.kcFormOptionsWrapperClass!}">
            <@field.checkbox name="logout-sessions" label=msg("logoutOtherSessions") value=true />
        </div>
    </div>
</#macro>
