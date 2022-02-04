sap.ui.define(["sap/ui/core/util/MockServer"], function(M) {
    "use strict";
    return {
        init: function() {
            var r = /.*\/$/.test("/sap/opu/odata/sap/CV_ATTACHMENT_SRV/") ? "/sap/opu/odata/sap/CV_ATTACHMENT_SRV/" : "/sap/opu/odata/sap/CV_ATTACHMENT_SRV/" + "/";
            var m = new M({
                rootUri: r
            });
            M.config({
                autoRespond: true,
                autoRespondAfter: 1000
            });
            m.simulate("/resources/sap/se/mi/plm/lib/attachmentservice/attachment/localService/metadata.xml", {
                sMockdataBaseUrl: "/resources/sap/se/mi/plm/lib/attachmentservice/attachment/localService/mockdata",
                bGenerateMissingMockData: true
            });
            var R = m.getRequests();
            var u = {
                "d": {
                    "__metadata": {
                        "type": "Collection(CV_ATTACHMENT_SRV.OriginalUploadParams)"
                    },
                    "results": [{
                        "__metadata": {
                            "type": "CV_ATTACHMENT_SRV.OriginalUploadParams"
                        },
                        "ApplicationId": "8CDCD4000C701EE7B190C70024DE0463",
                        "FileId": "8CDCD4000C701EE7B190C70024DE4463",
                        "OriginalUrl": "",
                        "Storagecategory": "HCP-DS.001",
                        "ContentType": "text/plain",
                        "URLToReadAttachment": "",
                        "URLToUploadAttachment": "https%3a%2f%2localhost:8080%3a443%2farchivelink%2fcommand%3fcreate%26pVersion%3d0047%26contRep%3dHCP-DS.001%26docId%3d8CDCD4000C701EE7B190C70024DE4463%26docProt%3ddru%26accessMode%3dc%26authId%3dCN%253DER9%2cOU%253DDLM%26expiration%3d20171108151040%26secKey%3dMIIBCAYJKoZIhvcNAQcCoIH6MIH3AgEBMQswCQYFKw4DAhoFADALBgkqhkiG9w0BBwExgdcwgdQCAQEwKDAcMQwwCgYDVQQLEwNETE0xDDAKBgNVBAMTA0VSOQIICiAVBxISJgEwCQYFKw4DAhoFAKBdMBgGCSqGSIb3DQEJAzELBgkqhkiG9w0BBwEwHAYJKoZIhvcNAQkFMQ8XDTE3MTEwODEzMTA0MFowIwYJKoZIhvcNAQkEMRYEFJ3wp9Tgl7IdHdmkG9BFpznipX18MAkGByqGSM44BAMEMDAuAhUAurjeFvw5y%252Be%252FCRLiXGVMWyRgG4ECFQCueO30aqi5JxjN4eSdHMZwXNY13A%253D%253D",
                        "URLToUpdateAttachment": "",
                        "SecureAccessToken": "FD3FQFFCWBJLLPZ9MSFKLYK1XCR4WPOZBTD0HYGX",
                        "SecureAccessCookie": ""
                    }, {
                        "__metadata": {
                            "type": "CV_ATTACHMENT_SRV.OriginalUploadParams"
                        },
                        "ApplicationId": "8CDCD4000C701EE7B190C70024DE0463",
                        "FileId": "8CDCD4000C701EE7B190C70024DE4463",
                        "OriginalUrl": "",
                        "Storagecategory": "HCP-DS.001",
                        "ContentType": "text/plain",
                        "URLToReadAttachment": "",
                        "URLToUploadAttachment": "https%3a%2f%2localhost:8080%3a443%2farchivelink%2fcommand%3fcreate%26pVersion%3d0047%26contRep%3dHCP-DS.001%26docId%3d8CDCD4000C701EE7B190C70024DE4463%26docProt%3ddru%26accessMode%3dc%26authId%3dCN%253DER9%2cOU%253DDLM%26expiration%3d20171108151040%26secKey%3dMIIBCAYJKoZIhvcNAQcCoIH6MIH3AgEBMQswCQYFKw4DAhoFADALBgkqhkiG9w0BBwExgdcwgdQCAQEwKDAcMQwwCgYDVQQLEwNETE0xDDAKBgNVBAMTA0VSOQIICiAVBxISJgEwCQYFKw4DAhoFAKBdMBgGCSqGSIb3DQEJAzELBgkqhkiG9w0BBwEwHAYJKoZIhvcNAQkFMQ8XDTE3MTEwODEzMTA0MFowIwYJKoZIhvcNAQkEMRYEFJ3wp9Tgl7IdHdmkG9BFpznipX18MAkGByqGSM44BAMEMDAuAhUAurjeFvw5y%252Be%252FCRLiXGVMWyRgG4ECFQCueO30aqi5JxjN4eSdHMZwXNY13A%253D%253D",
                        "URLToUpdateAttachment": "",
                        "SecureAccessToken": "DFNG9Y2DPBALR5JY8UXLCOLHPNRPBLN0JHWO3T21",
                        "SecureAccessCookie": ""
                    }]
                }
            };
            R.push({
                method: "GET",
                path: new RegExp("(.*)GetUploadURLWithToken(.*)"),
                response: function(x, U) {
                    x.respondJSON(200, {}, u);
                    return true;
                }
            });
            m.setRequests(R);
            m.start();
            jQuery.sap.log.info("Running the app with mock data");
        }
    };
});