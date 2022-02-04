sap.ui.define(["sap/ui/core/format/DateFormat", "sap/ui/core/ValueState", "zi2d/eam/malfunction/manages1/util/CodeHelper"], function(
    DateFormat, ValueState, CodeHelper) {
    "use strict";

    return {

        /**
         * .
         * @public
         * @param {string} sName
         * @returns {string} 
         */
        formatNameAndValuePair: function(sName, sValue) {
            if (!sName && !sValue) {
                return "";
            } else if (sValue && !sName) {
                return sValue.replace(/^0+/, "");
            } else if (!sValue && sName) {
                return sName;
            } else {
                return sName + " (" + sValue.replace(/^0+/, "") + ")";
            }
        },

        getMaterialThumbnailPartsList: function(sMaterial, bHasThumbnail) {
            /* As the Thumbnail selection only requires the Material ID we can
               call the C_AllMaterialsMalfuncManage Entity with an incomplete key here */
            return CodeHelper.getThumbnailUrl(this.getModel(), "/ZC_AllMaterialsMalfuncManage", {
                Material: sMaterial,
                Plant: "0000",
                StorageLocation: "0000",
                NotificationType: "",
                MaintenanceOrderType: ""
            }, false);
        },

        getMaterialThumbnailAllMaterials: function(sNotificationType, sMaintenanceOrderType, sMaterial, sPlant, sStorageLocation, bHasThumbnail) {
            return CodeHelper.getThumbnailUrl(this.getModel(), "/C_AllMaterialsMalfuncManage", {
                Material: sMaterial,
                Plant: sPlant,
                StorageLocation: sStorageLocation,
                NotificationType: sNotificationType,
                MaintenanceOrderType: sMaintenanceOrderType
            }, bHasThumbnail);
        },

        getMaterialThumbnailBOMMaterials: function(sHierarchyNodeUniqueID, sBillOfMaterial, sBillOfMaterialVariant, sMaterial,
            sNotificationType, sMaintenanceOrderType, bHasThumbnail) {
            return CodeHelper.getThumbnailUrl(this.getModel(), "/C_BOMMaterialsMalFuncManage", {
                HierarchyNodeUniqueID: sHierarchyNodeUniqueID,
                BillOfMaterial: sBillOfMaterial,
                BillOfMaterialVariant: sBillOfMaterialVariant,
                Material: sMaterial,
                NotificationType: sNotificationType,
                MaintenanceOrderType: sMaintenanceOrderType
            }, bHasThumbnail);
        },

        getMaterialThumbnailHistoricMaterials: function(sNotificationType, sMaintenanceOrderType, sMaterial, sTechnicalObject,
            sTechObjIsEquipOrFuncnlLoc, bHasThumbnail) {
            return CodeHelper.getThumbnailUrl(this.getModel(), "/C_HistMaterialsMalfuncManage", {
                TechnicalObject: sTechnicalObject,
                TechObjIsEquipOrFuncnlLoc: sTechObjIsEquipOrFuncnlLoc,
                Material: sMaterial,
                NotificationType: sNotificationType,
                MaintenanceOrderType: sMaintenanceOrderType
            }, bHasThumbnail);
        },

        formatCurrentNotificationsLink: function(sCount) {
            var oBundle = this.getModel("i18n").getResourceBundle();
            var sLinkText = oBundle.getText("xlnk.currentNotifications", [sCount]);
            return sLinkText;
        },

        formatDateTimeToString: function(oDateTime) {
            var dateTimeFormatter = DateFormat.getDateTimeInstance({
                style: "medium"
            });
            return (oDateTime) ? dateTimeFormatter.format(oDateTime) : "";
        },
        /**
         * formatter for DateMonitor: Convert to text
         * @param {string} sDateMonitor 
         * @return {string} text value
         * @public
         */
        formatDateMonitorToText: function(sDateMonitor) {
            var oBundle = this.getModel("i18n").getResourceBundle();
            switch (sDateMonitor) {
                case "I":
                    return oBundle.getText("xsel.dateMonitorStatusInactice");
                case "G":
                    return oBundle.getText("xsel.dateMonitorStatusStartDateNotReached");
                case "Y":
                    return oBundle.getText("xsel.dateMonitorStatusEndDateNotReached");
                case "R":
                    return oBundle.getText("xsel.dateMonitorStatusOverdue");
                default:
                    return oBundle.getText("xsel.dateMonitorStatusInactice");
            }
        },
        /**
         * formatter for DateMonitor: Convert to State value
         * @param {string} sDateMonitor 
         * @return {string} State value
         * @public
         */
        formatDateMonitorToState: function(sDateMonitor) {
            switch (sDateMonitor) {
                case "I":
                    return ValueState.Warning;
                case "G":
                    return ValueState.Success;
                case "Y":
                    return ValueState.Warning;
                case "R":
                    return ValueState.Error;
                default:
                    return ValueState.None;
            }
        },


        convertStringToInteger: function(sString) {
            return Number(sString);
        },

        checkForValidValue: function(v) {
            if (v === null || typeof v === "undefined" || v === "") {
                return false;
            } else {
                return (typeof v === "boolean") ? v : true;
            }
        },
        formatAttachmentIcon: function(m) {
            var a = {};
            a["application/msword"] = "sap-icon://doc-attachment";
            a["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = "sap-icon://doc-attachment";
            a["application/rtf"] = "sap-icon://doc-attachment";
            a["application/pdf"] = "sap-icon://pdf-attachment";
            a["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = "sap-icon://excel-attachment";
            a["application/msexcel"] = "sap-icon://excel-attachment";
            a["application/vnd.ms-powerpoint"] = "sap-icon://ppt-attachment";
            a["application/vnd.openxmlformats-officedocument.presentationml.presentation"] = "sap-icon://ppt-attachment";
            a["application/vnd.openxmlformats-officedocument.presentationml.slideshow"] = "sap-icon://ppt-attachment";
            a["application/mspowerpoint"] = "sap-icon://ppt-attachment";
            a["application/xml"] = "sap-icon://attachment-html";
            a["application/xhtml+xml"] = "sap-icon://attachment-html";
            a["application/x-httpd-php"] = "sap-icon://attachment-html";
            a["application/x-javascript"] = "sap-icon://attachment-html";
            a["application/gzip"] = "sap-icon://attachment-zip-file";
            a["application/x-rar-compressed"] = "sap-icon://attachment-zip-file";
            a["application/x-tar"] = "sap-icon://attachment-zip-file";
            a["application/zip"] = "sap-icon://attachment-zip-file";
            a["audio/voxware"] = "sap-icon://attachment-audio";
            a["audio/x-aiff"] = "sap-icon://attachment-audio";
            a["audio/x-midi"] = "sap-icon://attachment-audio";
            a["audio/x-mpeg"] = "sap-icon://attachment-audio";
            a["audio/x-pn-realaudio"] = "sap-icon://attachment-audio";
            a["audio/x-pn-realaudio-plugin"] = "sap-icon://attachment-audio";
            a["audio/x-qt-stream"] = "sap-icon://attachment-audio";
            a["audio/x-wav"] = "sap-icon://attachment-audio";
            a["image/png"] = "sap-icon://attachment-photo";
            a["image/tiff"] = "sap-icon://attachment-photo";
            a["image/bmp"] = "sap-icon://attachment-photo";
            a["image/jpeg"] = "sap-icon://attachment-photo";
            a["image/jpg"] = "sap-icon://attachment-photo";
            a["image/gif"] = "sap-icon://attachment-photo";
            a["text/plain"] = "sap-icon://attachment-text-file";
            a["text/comma-separated-values"] = "sap-icon://attachment-text-file";
            a["text/css"] = "sap-icon://attachment-text-file";
            a["text/html"] = "sap-icon://attachment-text-file";
            a["text/javascript"] = "sap-icon://attachment-text-file";
            a["text/plain"] = "sap-icon://attachment-text-file";
            a["text/richtext"] = "sap-icon://attachment-text-file";
            a["text/rtf"] = "sap-icon://attachment-text-file";
            a["text/tab-separated-values"] = "sap-icon://attachment-text-file";
            a["text/xml"] = "sap-icon://attachment-text-file";
            a["video/mpeg"] = "sap-icon://attachment-video";
            a["video/quicktime"] = "sap-icon://attachment-video";
            a["video/x-msvideo"] = "sap-icon://attachment-video";
            a["application/x-shockwave-flash"] = "sap-icon://attachment-video";
            return a[m] ? a[m] : "sap-icon://document";
        }



    };
});