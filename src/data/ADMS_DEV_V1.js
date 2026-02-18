export default {
    "filterId": "ADMS_DEV_V1",
    "rules": [
        {
            "Header_String": {
                "value": [
                    "ZHV|D0132001|X|%|R|EELC|%|TR01",
                    "ZHV|D0132001|X|%|R|LOND|%|TR01",
                    "ZHV|D0132001|X|%|R|SEEB|%|TR01"
                ],
                "fileName": "{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/ADMS_OUT/Disconnection_D0132"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0135002|%|%|J|EELC|%|TR01",
                    "ZHV|D0135002|%|%|J|LOND|%|TR01",
                    "ZHV|D0135002|%|%|J|SEEB|%|TR01"
                ],
                "fileName": "{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/ADMS_OUT/D0135"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0171001|P|EDFI|X|EXT|%|TR01",
                    "ZHV|D0171001|P|EELC|X|EXT|%|TR01",
                    "ZHV|D0171001|P|LOND|X|EXT|%|TR01",
                    "ZHV|D0171001|P|SEEB|X|EXT|%|TR01",
                    "ZHV|D0217001|P|EDFI|X|EXT|%|TR01",
                    "ZHV|D0217001|P|EELC|X|EXT|%|TR01",
                    "ZHV|D0217001|P|LOND|X|EXT|%|TR01"
                ],
                "fileName": "{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/ADMS_OUT/D0171_temp"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0384001|X|%|R|EELC|%|TR01",
                    "ZHV|D0384001|X|%|R|LOND|%|TR01",
                    "ZHV|D0384001|X|%|R|SEEB|%|TR01"
                ],
                "fileName": "{flow}{uuid}{fromRole}{fromParty}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/ADMS_OUT/D0384"
        }
    ],
    "Application": "ADMS_DEV_V1",
    "status": "active",
    "id": "ADMS_DEV_V1",
    "_rid": "nPkHALmcN2sKAAAAAAAAAA==",
    "_self": "dbs/nPkHAA==/colls/nPkHALmcN2s=/docs/nPkHALmcN2sKAAAAAAAAAA==/",
    "_etag": "\"1a000c7b-0000-1100-0000-6902386f0000\"",
    "_attachments": "attachments/",
    "_ts": 1761753199
}