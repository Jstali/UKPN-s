export default {
    "filterId": "MPRS_DEV_V1",
    "rules": [
        {
            "Header_String": {
                "value": [
                    "ZHV|FDB00001|R|10|P|EELC|DB01|TR01",
                    "ZHV|FDB00001|R|10|P|EELC|DB02|TR01",
                    "ZHV|FDB00001|R|10|P|EELC|DB03|TR01",
                    "ZHV|FDB01001|R|10|P|EELC|DB01|TR01",
                    "ZHV|FDB01002|R|10|P|EELC|DB01|TR01",
                    "ZHV|FDB02001|R|10|P|EELC|%|TR01",
                    "ZHV|FDB02002|R|10|P|EELC|%|TR01",
                    "ZHV|FDB03001|R|10|P|EELC|%|TR01",
                    "ZHV|FDB05001|R|10|P|EELC|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/EPN_instr_in_active"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0205001|X|%|P|EELC|%|TR01",
                    "ZHV|D0312003|M|%|P|EELC|%|TR01",
                    "ZHV|D0324001|Z|GDCC|P|EELC|%|TR01",
                    "ZHV|D0358001|X|%|P|EELC|%|TR01",
                    "ZHV|D0386001|X|%|P|EELC|%|TR01",
                    "ZHV|FDB80001|R|10|P|EELC|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/EPN_instr_in_idt"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0350001|Z|DCCO|P|EELC|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/EPN_dcc_in_active"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|FDB00001|R|10|P|LOND|DB01|TR01",
                    "ZHV|FDB00001|R|10|P|LOND|DB02|TR01",
                    "ZHV|FDB00001|R|10|P|LOND|DB03|TR01",
                    "ZHV|FDB01001|R|10|P|LOND|DB01|TR01",
                    "ZHV|FDB01002|R|10|P|LOND|DB01|TR01",
                    "ZHV|FDB02001|R|10|P|LOND|%|TR01",
                    "ZHV|FDB02002|R|10|P|LOND|%|TR01",
                    "ZHV|FDB03001|R|10|P|LOND|%|TR01",
                    "ZHV|FDB05001|R|10|P|LOND|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/LPN_instr_in_active"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0205001|X|%|P|LOND|%|TR01",
                    "ZHV|D0304001|M|%|P|LOND|%|TR01",
                    "ZHV|D0312003|M|%|P|LOND|%|TR01",
                    "ZHV|D0324001|Z|GDCC|P|LOND|%|TR01",
                    "ZHV|D0358001|X|%|P|LOND|%|TR01",
                    "ZHV|D0386001|X|%|P|LOND|%|TR01",
                    "ZHV|FDB80001|R|10|P|LOND|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/LPN_instr_in_idt"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0350001|Z|DCCO|P|LOND|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/LPN_dcc_in_active"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|FDB00001|R|10|P|SEEB|DB01|TR01",
                    "ZHV|FDB00001|R|10|P|SEEB|DB02|TR01",
                    "ZHV|FDB00001|R|10|P|SEEB|DB03|TR01",
                    "ZHV|FDB01001|R|10|P|SEEB|DB01|TR01",
                    "ZHV|FDB01002|R|10|P|SEEB|DB01|TR01",
                    "ZHV|FDB02001|R|10|P|SEEB|%|TR01",
                    "ZHV|FDB02002|R|10|P|SEEB|%|TR01",
                    "ZHV|FDB03001|R|10|P|SEEB|%|TR01",
                    "ZHV|FDB05001|R|10|P|SEEB|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/SPN_instr_in_active"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0205001|X|%|P|SEEB|%|TR01",
                    "ZHV|D0304001|M|%|P|SEEB|%|TR01",
                    "ZHV|D0312003|M|%|P|SEEB|%|TR01",
                    "ZHV|D0324001|Z|GDCC|P|SEEB|%|TR01",
                    "ZHV|D0358001|X|%|P|SEEB|%|TR01",
                    "ZHV|D0386001|X|%|P|SEEB|%|TR01",
                    "ZHV|FDB80001|R|10|P|SEEB|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/SPN_instr_in_idt"
        },
        {
            "Header_String": {
                "value": [
                    "ZHV|D0350001|Z|DCCO|P|SEEB|%|TR01"
                ],
                "fileName": "{fromRole}{fromParty}{uuid}"
            },
            "destination": "//UKPNNA-1150.ukpn.local/UKPNFS01-DATA/X-DRIVE/IM/TR01/COSMOS_COP/DTC_DEV/MPRS_OUT/SPN_dcc_in_active"
        }
    ],
    "Application": "MPRS_DEV_V1",
    "status": "active",
    "id": "MPRS_DEV_V1",
    "_rid": "nPkHALmcN2sIAAAAAAAAAA==",
    "_self": "dbs/nPkHAA==/colls/nPkHALmcN2s=/docs/nPkHALmcN2sIAAAAAAAAAA==/",
    "_etag": "\"1b003a8c-0000-1100-0000-69035c7a0000\"",
    "_attachments": "attachments/",
    "_ts": 1761827962
}