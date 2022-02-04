sap.ui.define([
    "./../DialogController"
], function(DialogController) {
    "use strict";

    return DialogController.extend("zi2d.eam.malfunction.manages1.controller.fragment.EditJobHeaderDialog", {

        onInit: function() {
            this.getRouter().getRoute("editNotificationHeader").attachMatched(this.onRouteMatched, this);
        },

        onRouteMatched: function() {
            var that = this;

            that.getModel("app").setProperty("/isBusy", true);

            this.prepareTransaction()
                .then(function() {
                    return that.parentContextAvailable();
                }).then(function() {
                    return that.initializeDraftDialog("pmMalfuncManageDialogEditJobHeader", that.getView().getParent().getBindingContext(), "malfuncManageSmartFormEditJobHeader");
                }).then(function() {
                    that.registerAdditionalAssociation("to_PersonResponsible");
                    that.registerAdditionalAssociation("to_PMContactCardUser");
                });
        }

    });

});