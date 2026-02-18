export default {
    "filterId": "MSBI_DEV_V1",
    "rules": [
        {
            "Header_String": {
                "value": [
                    "ZHV|D0139002|R|EELC|M|EXT|%|TR01",
                    "ZHV|D0139002|R|LOND|M|EXT|%|TR01",
                    "ZHV|D0139002|R|SEEB|M|EXT|%|TR01",
                    "ZHV|D0139002|R|EELC|X|EXT|%|TR01",
                    "ZHV|D0139002|R|LOND|X|EXT|%|TR01",
                    "ZHV|D0139002|R|SEEB|X|EXT|%|TR01"
                ],
                "fileName": "{flow}{uuid}{fromRole}{fromParty}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0125001|R|EELC|X|%|%|TR01",
                    "ZHV|D0125001|R|LOND|X|%|%|TR01",
                    "ZHV|D0125001|R|SEEB|X|%|%|TR01",
                    "ZHV|D0132001|X|%|R|EELC|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0132"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0132001|X|%|R|LOND|%|TR01",
                    "ZHV|D0132001|X|%|R|SEEB|%|TR01",
                    "ZHV|D0132001|X|%|P|EELC|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0132"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0134001|X|%|R|EELC|%|TR01",
                    "ZHV|D0134001|X|%|R|LOND|%|TR01",
                    "ZHV|D0134001|X|%|R|SEEB|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0134"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0139002|M|%|R|EELC|%|TR01",
                    "ZHV|D0139002|M|%|R|LOND|%|TR01",
                    "ZHV|D0139002|M|%|R|SEEB|%|TR01"
                ],
                "fileName": "{flow}{uuid}{fromRole}{fromParty}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0139"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0170001|M|%|R|EELC|%|TR01",
                    "ZHV|D0170001|S|%|R|EELC|%|TR01",
                    "ZHV|D0170001|T|%|R|EELC|%|TR01",
                    "ZHV|D0170001|M|%|R|LOND|%|TR01",
                    "ZHV|D0170001|S|%|R|LOND|%|TR01",
                    "ZHV|D0170001|T|%|R|LOND|%|TR01",
                    "ZHV|D0170001|M|%|R|SEEB|%|TR01",
                    "ZHV|D0170001|S|%|R|SEEB|%|TR01",
                    "ZHV|D0170001|T|%|R|SEEB|%|TR01"
                ],
                "fileName": "{flow}{uuid}{fromRole}{fromParty}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0170"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0171001|P|EELC|X|%|%|TR01",
                    "ZHV|D0171001|P|LOND|X|%|%|TR01",
                    "ZHV|D0171001|P|SEEB|X|%|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0171"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0262001|R|EELC|X|%|%|TR01",
                    "ZHV|D0262001|R|LOND|X|%|%|TR01",
                    "ZHV|D0262001|R|SEEB|X|%|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0262"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0352001|R|EELC|X|%|%|TR01",
                    "ZHV|D0352001|R|LOND|X|%|%|TR01",
                    "ZHV|D0352001|R|SEEB|X|%|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0352"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0383001|R|EELC|M|EXT|%|TR01",
                    "ZHV|D0383001|R|LOND|M|EXT|%|TR01",
                    "ZHV|D0383001|R|SEEB|M|EXT|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_D0383"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|M0003001|R|%|R|%|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_M0003"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|M0004001|R|%|R|%|%|TR01"
                ],
                "fileName": "{uuid}.txt"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MSBI_OUT/Incoming_M0004"
        }
    ],
    "Application": "MSBI_DEV_V1",
    "status": "active",
    "id": "MSBI_DEV_V1",
    "_rid": "nPkHALmcN2sQAAAAAAAAAA==",
    "_self": "dbs/nPkHAA==/colls/nPkHALmcN2s=/docs/nPkHALmcN2sQAAAAAAAAAA==/",
    "_etag": "\"1a00e07b-0000-1100-0000-6902392c0000\"",
    "_attachments": "attachments/",
    "_ts": 1761753388
}