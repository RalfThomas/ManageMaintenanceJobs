sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/comp/smartfilterbar/FilterProvider",
    "sap/ui/model/odata/v2/ODataListBinding"
], function(BaseObject, FilterProvider, ODataListBinding) {
    "use strict";
    return BaseObject.extend("zi2d.eam.malfunction.manages1.util.VariantHelper", {

        _oSmartFilterBar: null,
        _oSmartVariantManagement: null,

        constructor: function(oSmartVariantManagement, oSmartFilterBar) {
            this._oSmartVariantManagement = oSmartVariantManagement;
            this._oSmartFilterBar = oSmartFilterBar;
        },

        /**
         * Creates $count URL for a given variant.
         * 
         * @param {string} [sVariantKey] - Variant key in SmartVariantManagement (for entire page). Defaults to standard variant.
         * */
        createCountUrlForVariant: function(sVariantKey) {
            var _sVariantKey = sVariantKey,
                mParameters = {};

            if (!_sVariantKey) {
                _sVariantKey = this._oSmartVariantManagement.getDefaultVariantKey();
            }

            var mFilterVariant = this._oSmartVariantManagement.getVariantContent(this._oSmartFilterBar, _sVariantKey);

            // get all possible filter fields from filterbar
            var aFilterFields = jQuery.map(this._oSmartFilterBar.getFilterItems().concat(this._oSmartFilterBar.getFilterGroupItems()), function(
                oFilterItem) {
                return (oFilterItem.getHiddenFilter() ? null : oFilterItem.getName());
            });

            if (mFilterVariant.filterBarVariant) {
                var aFilters = FilterProvider.generateFilters(aFilterFields, JSON.parse(mFilterVariant.filterBarVariant));
            }

            if (mFilterVariant.basicSearch) {
                mParameters.search = mFilterVariant.basicSearch;
            }

            var oBinding = new ODataListBinding(this._oSmartVariantManagement.getModel(), "/" + this._oSmartFilterBar.getEntitySet() + "/$count",
                null, [],
                aFilters, {
                    custom: mParameters
                });
            oBinding.initialize();
            return oBinding.getDownloadUrl();
        },

        /**
         * Updates all tiles ("bookmarks") contained in the launchpad which reference a specific variant.
         * 
         * @param {string} sBaseUrl - Intent to look for. Example: #MaintenanceJob-manageMalfunction
         **/
        updateServiceUrlInBookmarks: function(sBaseUrl) {
            var oBookmarkService = sap.ushell && sap.ushell.Container && sap.ushell.Container.getService && sap.ushell.Container.getService(
                    "Bookmark"),
                sDefaultVariantKey = this._oSmartVariantManagement.getDefaultVariantKey(),
                aVariants = this._oSmartVariantManagement.getVariantItems(),
                that = this;

            if (sDefaultVariantKey === this._oSmartVariantManagement.getStandardVariantKey()) {
                aVariants.push({
                    key: sDefaultVariantKey
                });
            }

            if (!oBookmarkService) {
                return;
            }

            var aExistingBookmarks = jQuery.map(aVariants, function(oVariant) {
                var sKey = oVariant.getKey ? oVariant.getKey() : oVariant.key,
                    aUrlCandidates = [sBaseUrl + "?variantKey=" + sKey];

                if (sKey === sDefaultVariantKey) {
                    aUrlCandidates.push(sBaseUrl);
                }

                return jQuery.each(aUrlCandidates, function(i, sUrlCandidate) {
                    return oBookmarkService.countBookmarks(sUrlCandidate).then(function(iCount) {
                        if (iCount > 0) {
                            return oBookmarkService.updateBookmarks(sUrlCandidate, {
                                serviceUrl: that.createCountUrlForVariant(sKey)
                            });
                        }
                    });
                });
            });
        }

    });
});