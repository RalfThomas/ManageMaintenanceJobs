sap.ui.define(["zi2d/eam/malfunction/manages1/component/attachment/Component"], function(A) {
    "use strict";
    var C = A.extend("zi2d.eam.malfunction.manages1.component.attachment.components.fscomponent.Component", {
        metadata: {
            manifest: "json",
            library: "zi2d.eam.malfunction.manages1.component.attachment",
            publicMethods: [
                "save",
                "cancel",
                "refresh",
                "getApplicationState",
                "getAttachmentCount"
            ]
        }
    });
    return C;
});