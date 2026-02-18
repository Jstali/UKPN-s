export default {
    "filterId": "Electralink_DEV_V1",
    "rules": [
        {
            "Header_String": {
                "value": [
                    "ZHV|%|3|EDFI|%|EXT|%|TR01",
                    "ZHV|%|3|EELC|%|EXT|%|TR01",
                    "ZHV|%|3|LOND|%|EXT|%|TR01",
                    "ZHV|%|3|SEEB|%|EXT|%|TR01",
                    "ZHV|%|P|EDFI|%|EXT|%|TR01",
                    "ZHV|%|P|EELC|%|EXT|%|TR01",
                    "ZHV|%|P|LOND|%|EXT|%|TR01",
                    "ZHV|%|P|SEEB|%|EXT|%|TR01",
                    "ZHV|%|R|EDFI|%|EXT|%|TR01",
                    "ZHV|%|R|EELC|%|EXT|%|TR01",
                    "ZHV|%|R|LOND|%|EXT|%|TR01",
                    "ZHV|%|R|SEEB|%|EXT|%|TR01",
                    "ZHV|%|J|EELC|M|%|%|TR01",
                    "ZHV|%|J|LOND|M|%|%|TR01",
                    "ZHV|%|J|SEEB|M|%|%|TR01",
                    "ZHV|%|J|EELC|X|%|%|TR01",
                    "ZHV|%|J|LOND|X|%|%|TR01",
                    "ZHV|%|J|SEEB|X|%|%|TR01",
                    "ZHV|%|M|%|P|EELC|%|TR01"
                ],
                "fileName": "{uuid}_{sourceFilename}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/ELECTRALINK_OUT/ToElectralink"
        }
    ],
    "Application": "Electralink_DEV_V1",
    "status": "active",
    "id": "Electralink_DEV_V1",
    "_rid": "nPkHALmcN2sUAAAAAAAAAA==",
    "_self": "dbs/nPkHAA==/colls/nPkHALmcN2s=/docs/nPkHALmcN2sUAAAAAAAAAA==/",
    "_etag": "\"7500b853-0000-1100-0000-69087a940000\"",
    "_attachments": "attachments/",
    "_ts": 1762163348
}