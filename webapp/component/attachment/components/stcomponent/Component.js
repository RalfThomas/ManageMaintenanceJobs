sap.ui.define([
    "sap/ui/core/UIComponent", "sap/suite/ui/generic/template/extensionAPI/ReuseComponentSupport"
], function(U, R) {
    "use strict";
    var C = U.extend("zi2d.eam.malfunction.manages1.component.attachment.components.stcomponent.Component", {
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
                semanticObject: {
                    type: 'string',
                    group: 'Misc',
                    bindable: true,
                    defaultValue: null
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
                stIsAreaVisible: {
                    type: 'boolean',
                    group: 'standard'
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
        init: function() {
            (U.prototype.init || jQuery.noop).apply(this, arguments);
            R.mixInto(this);
        },
        createContent: function() {
            this.page = new sap.ui.view({
                viewName: "zi2d.eam.malfunction.manages1.component.attachment.view.Attachment",
                type: sap.ui.core.mvc.ViewType.XML
            });
            if (this.getComponentData()) {
                this.setModel(this.getComponentData().attachmentSettings, "attachmentSettings");
            }
            return this.page;
        },
        setProperty: function(n, v) {
            sap.ui.core.UIComponent.prototype.setProperty.apply(this, arguments);
        },
        stStart: function(m, b, e) {
            this.oModel = m;
            this.oBindingContext = b;
            this.oExtensionAPI = e;
            this.setControllerProperties();
        },
        stRefresh: function(m, b, e) {
            this.oModel = m;
            this.oBindingContext = b;
            this.oExtensionAPI = e;
            this.setControllerProperties();
        },
        setStIsAreaVisible: function(i) {
            if (i !== this.getStIsAreaVisible()) {
                this.setProperty("stIsAreaVisible", i);
                this.setControllerProperties();
            }
        },
        setControllerProperties: function() {
            if (this.oBindingContext && this.getStIsAreaVisible()) {
                var s = this;
                if (s.page.getController().setProperties) {
                    s.page.getController().setProperties(s.getMode(), s.getObjectType(), s.getObjectKey(), s.getSemanticObject(), s.getDocumentType());
                    this.oBindingContext = null;
                }
            }
        },
        setMode: function(v) {
            this.setProperty("mode", v);
            this.page.getController().setModeProperty(v);
        },
        setAttributeHanding: function(v) {
            this.page.getController().setAttributes(v);
        },
        getAttributes: function() {
            return this.page.getController().getAttributeList();
        },
        setDocumentType: function(v) {
            this.page.getController().setDocTypeProperty(v);
        },
        setAttributes: function(a) {
            this.page.getController().setAttributes(a);
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
        }
    });
    return C;
});