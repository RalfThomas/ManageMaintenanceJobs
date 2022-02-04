sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/Device", "zi2d/eam/malfunction/manages1/model/models", "sap/m/MessageBox"], function(U, D, m, M) {
    "use strict";
    return U.extend("zi2d.eam.malfunction.manages1.Component", {
        _oMetadataLoaded: null,
        _oModel: null,
        metadata: {
            manifest: "json",
            handleValidation: true
        },
        init: function() {
            U.prototype.init.apply(this, arguments);
            this.getModel().attachMetadataFailed(this.onMetadataFailed, this);
            this.getModel().attachRequestFailed(this.onRequestFailed, this);
            this.setModel(m.createDeviceModel(), "device");
            this.setModel(m.createAppModel(), "app");
            this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
            this.getRouter().initialize();
            this.getModel().setDeferredGroups(["ALL_MATERIALS", "Changes"]);
            this.getModel().setChangeGroups({
                "C_AllMaterialsMalfuncManageType": {
                    groupId: "ALL_MATERIALS",
                    single: true
                },
                "*": {
                    groupId: "Changes",
                    changeSetId: "Changes",
                    single: false
                }
            });
        },
        onMetadataFailed: function(e) {
            M.show(this.getModel("i18n").getProperty("ymsg.connectionError"), {
                icon: "ERROR",
                details: e.getParameter("message"),
                onClose: this.showErrorPage.bind(this)
            });
        },
        onRequestFailed: function(e) {
            if (this.getModel("message").getProperty("/").filter(function(a) {
                    return a.code === "EAM_OSTAT/001";
                }).length === 0) {
                return;
            }
            this.getModel().detachRequestFailed(this.onRequestFailed, this);
            var r = this.getRootControl().getController();
            var o = r.createMessageViewDialog({
                title: "{i18n>xtit.error}",
                message: "{i18n>ymsg.internalError}",
                state: sap.ui.core.ValueState.Error
            });
            r.getView().addDependent(o);
            o.open();
            o.attachAfterClose(this.showErrorPage.bind(this));
        },
        showErrorPage: function() {
            this.getRouter().getTargets().display("errorMessage");
        },
        getMetadataLoadedPromise: function() {
            return this._oMetadataLoaded;
        }
    });
});