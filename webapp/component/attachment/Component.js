sap.ui.define(["sap/ui/core/UIComponent"], function(U) {
    "use strict";
    var C = U.extend("zi2d.eam.malfunction.manages1.component.attachment.Component", {
        metadata: {
            manifest: "json",
            library: "zi2d.eam.malfunction.manages1.component.attachment",
            publicMethods: [
                "save",
                "cancel",
                "refresh",
                "getApplicationState",
                "getAttachmentCount"
            ],
            properties: {
                mode: {
                    type: 'string',
                    group: 'Misc',
                    defaultValue: 'D'
                },
                objectKey: {
                    type: 'string',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
                },
                objectType: {
                    type: 'string',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
                },
                semanticObject: {
                    type: 'string',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
                },
                isDraft: {
                    type: 'boolean',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: false
                },
                isGuid: {
                    type: 'boolean',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: false
                },
                attachmentCount: {
                    type: 'int',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
                },
                attributeHandling: {
                    type: 'object',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
                },
                flavor: {
                    type: 'string',
                    group: 'Misc',
                    defaultValue: "withoutCheckIn"
                },
                documentType: {
                    type: 'string',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
                }
            },
            events: {
                "onupload": {},
                "onrename": {},
                "ondelete": {}
            }
        },
        createContent: function() {
            this.page = new sap.ui.view({
                viewName: "zi2d.eam.malfunction.manages1.component.attachment.view.Attachment",
                type: sap.ui.core.mvc.ViewType.XML
            });
            return this.page;
        },
        setProperty: function(n, v) {
            sap.ui.core.UIComponent.prototype.setProperty.apply(this, arguments);
        },
        setMode: function(v) {
            this.setProperty("mode", v);
            this.page.getController().setModeProperty(v);
        },
        setObjectKey: function(v) {
            this.setProperty("objectKey", v);
            this.page.getController().setProperties(this.getMode(), this.getObjectType(), v, this.getSemanticObject(), this.getDocumentType());
        },
        setObjectType: function(v) {
            this.setProperty("objectType", v);
            this.page.getController().setProperties(this.getMode(), v, this.getObjectKey(), this.getSemanticObject(), this.getDocumentType());
        },
        setAttributeHanding: function(v) {
            this.page.getController().setAttributes(v);
        },
        getAttributes: function() {
            return this.page.getController().getAttributeList();
        },
        setAttributes: function(a) {
            this.page.getController().setAttributes(a);
        },
        setDocumentType: function(v) {
            this.page.getController().setDocTypeProperty(v);
        },
        save: function(i) {
            return this.page.getController().commitChanges(i);
        },
        cancel: function(i) {
            return this.page.getController().cancelChanges(i);
        },
        refresh: function(a, o, b, s) {
            this.page.getController().setProperties(a, o, b, s);
        },
        getApplicationState: function() {
            return this.page.getController().getApplicationState();
        },
        getAttachmentCount: function() {
            return this.page.getController().getAttachmentCount();
        },
        getAllAttachments: function(a, c, s) {
            return this.page.getController().onDownloadAll(a, c, s);
        },
        downloadSingleAttachment: function(p) {
            return this.page.getController().downloadDirectAttachments([p]);
        },
        downloadMultipleAttachments: function(p) {
            return this.page.getController().downloadDirectAttachments(p);
        },
        uploadFiles: function(u, c) {
            return this.page.getController().uploadFiles(u, c);
        },
        checkOutFile: function(c, a) {
            return this.page.getController().checkOut(c, a);
        },
        getAttachmentsByAlternateKey: function(o, a, s, c) {
            return this.page.getController().getAttachmentsByAlternateKey(o, a, s, c);
        }
    });
    return C;
});