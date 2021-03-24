//import Promise from "bluebird";
import axios from "axios";
import _ from "lodash";
import debug from "debug";
import { Service } from '@oada/jobs';
import config from "./config.js";
import secrets from "./secrets";
//import porkTrees from '@pork/trees';
//const { asntree } = porkTrees;
import { ListWatch } from "@oada/list-lib";
//import { config } from "dotenv";

/* Constants and Variables */
const OSC_WEBHOOK = "osc-webhooks";
const OSC_WEBHOOK_SERVICE = "osc-webhooks-service-generates-pac";

let OADA: any = null;
const info = debug(`${OSC_WEBHOOK}:info`);
const trace = debug(`${OSC_WEBHOOK}:trace`);

// configuration details
const hackathon_id = "farmer.porkhack3.openag.io";
const entity: string = config.get("entity");
//const TOKEN: any = secrets[hackathon_id][entity]["token"];
//console.log("--> token ", TOKEN);
const TOKEN = config.get('token');
let DOMAIN = config.get('domain') || '';
const PATH = config.get('path');
const OSC_WEBHOOK_ENDPOINT = config.get('oscwebhook');

if (DOMAIN.match(/^http/)) DOMAIN = DOMAIN.replace(/^https:\/\//, '')

if (DOMAIN === 'localhost' || DOMAIN === 'proxy') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const service = new Service(OSC_WEBHOOK, DOMAIN, TOKEN, 1, {
  finishReporters: []
}); // 1 concurrent job

// ============================================================================
// starting serverless-computing service
// ============================================================================
console.log("--> starting serverless-computing webhooks service");
service.start().catch(e => console.error('Service threw uncaught error: ', e));

// local connection
const _conn = service.getClient(DOMAIN).clone(TOKEN);
OADA = _conn;


// Hashtable for ASNs 
export interface ASNHash {
  [key: string]: object
};

let ASNS: ASNHash = {};

type ASN = {
  id: string,
  ship_date: string,
  farmer: object,
  hauler: object,
  processor: object
};


let asn_template = {
  id: "asn-osc-pac",
  ship_date: "2021-03-25",
  farmer: {
    name: "Ault Farms, Inc.",
    ship_location: {
      premise_id: "1939842",
      address: "Address",
    },
    certifications: {
      "02jkfjf0i2ofk": {
        cert_type: "PQA-PLUS",
        expiration: "2022-04-20",
        certification_id: "9381923834"
      }
    }
  },
  hauler: {
    name: "Hauler, Inc.",
    ship_location: {
      premise_id: "1939843",
      address: "Address",
    },
    certifications: {
      "902u390r2j3iof": {
        cert_type: "TQA",
        expiration: "2022-04-25",
        certification_id: "2890183410942",
        pac: {
          id: "pacid",
          result: "valid"
        }
      }
    }
  },
  processor: {
    name: "Processor, Inc.",
    ship_location: {
      premise_id: "1939844",
      address: "Address",
    },
    certifications: {
      "certification-random-string": {
        cert_type: "TQA",
        expiration: "2022-04-25",
        certification_id: "444444444444",
        pac: {
          id: "pacid",
          result: "valid"
        }
      }
    }
  }
};

// Enumeration for the entities (farmer, processor, hauler) in the service
enum Entities {
  farmer = "farmer",
  processor = "processor",
  hauler = "hauler"
};

// Enumeration for the Certification Types according to the defined schema
enum CertificationTypes {
  PQA = "PQA-PLUS",
  TQA = "TQA"//Transport_Quality_Assurance
};

// this is the type for the structure of the payload that we need to send to the 
// serverless function. That is, the serverless function is expecting the same type in the other end.
// Entity refers to farmer, processor, hauler
type CertificationPayload = {
  certification_id: string,
  certification_type: CertificationTypes,
  certification_expiration: string,
  entity_certification_id: string,
  entity_type: string,
  entity_path: string
};

// headers needed for the Serverless Function
// this is a simplified version of the headers for the hackathon
let serverless_functions_headers = {
  "Content-type": "application/json"
};

// Result of the OSC validation in the PAC
enum Result {
  valid = "valid",
  invalid = "invalid"
};

// Signature Type
type Signature = {
  type: string,
  value: string
};

// Private Automated Certifications Type
type PAC = {
  pacid: string,
  result: Result,
  signatures: Array<Signature>
};

type OSCResponse = {
  pac: PAC,
  message: string
};

/**
 * This function triggers an OSC Webhook according to certain validations that avoid too many calls 
 * to the serverless functions endpoints
 * The OSC webhooks are just triggered when three fields (certificationid, expiration, certtype) are
 * present in the certification.
 * @param certifications an array of certifications that can possible need a new PAC
 */
async function triggerOSCWebhook(certifications: Array<CertificationPayload>) {
  console.log("--> Triggering webhook that calls Quality Assurance Certifications OSC.");

  certifications.forEach(async (certification) => {
    if (typeof certification.certification_id !== 'undefined' && typeof certification.certification_type !== 'undefined') {
      console.log("--> certification id ", certification.certification_id);
      console.log("--> certification type ", certification.certification_type);
      let _content = { data: certification };

      return axios({
        method: 'post',
        url: OSC_WEBHOOK_ENDPOINT,
        headers: serverless_functions_headers,
        data: _content
      }).then(async (response) => {
        console.log("--> OSC executed, verifying PAC.");
        console.log(response.data);
        if (response.data.hasOwnProperty("pac")) {
          let _path = `${PATH}${certification.entity_path}/${certification.entity_type}/certifications/${certification.entity_certification_id}`;

          let _data = { pac: response.data.pac };
          await OADA.put({
            path: _path,
            data: _data
          }).then((result: any) => {
            console.log("--> PAC stored in the ASN.");
          }).catch((error: any) => {
            console.log("--> Error when updating PAC in certification. ", error);
          });
        }//if

      }).catch((error) => {
        console.log("--> Error: ", error);
      });
    }//
  });//for

}//triggerWebhook

/**
 * removes reserved properties
 * @param body change feed body
 * @returns 
 */
function stripReservedWords(body: any) {
  let cleanBody = _.cloneDeep(body);
  for (const key in cleanBody) {
    if (key.substring(0, 1) === "_") {
      delete cleanBody[key];
    }
  }//for
  return cleanBody;
}//stripReservedWords

/**
 * gets the certifications that need a PAC
 * @param change change feed
 * @returns 
 */
function getCertifications(change: any): Array<CertificationPayload> {
  let result: Array<CertificationPayload> = [];

  let body = change.body;
  let path = change.path;

  // checks for farmer/processor/hauler key elements + certifications
  for (const entity in Entities) {
    //console.log("--> processing ", entity);
    if (body.hasOwnProperty(entity) && body[entity].hasOwnProperty("certifications")) {
      let _certifications = body[entity].certifications;
      for (const key in _certifications) {
        if (_certifications[key].hasOwnProperty("certificationid") &&
          _certifications[key].hasOwnProperty("certtype") &&
          _certifications[key].hasOwnProperty("expiration")) {
          let _certificationPayload: CertificationPayload = {
            certification_id: _certifications[key].certificationid,
            certification_type: _certifications[key].certtype,
            certification_expiration: _certifications[key].expiration,
            entity_type: entity,
            entity_certification_id: key,
            entity_path: path
          };
          result.push(_certificationPayload);
        }//if
      }//for
    }//if
  }//for
  return result;
}//getCertifications

/**
 * Manages the changes in the change feed
 * This function decides if it is needed to call a webhook to create a PAC
 * @param change: the change feed
 */
async function manageChanges(change: any) {
  //console.log(change);
  if (change["body"].hasOwnProperty("farmer")) {
    console.log("--> ", change["body"]["farmer"]);
  }

  let _resource_id = change.resource_id;
  let _certifications: Array<CertificationPayload> = [];
  if (ASNS.hasOwnProperty(_resource_id)) {
    console.log("--> object has the property.");
  } else {
    // initialize the asn entry in the hashmap
    if (change.body._rev === 2) {
      ASNS[_resource_id] = {};
      ASNS[_resource_id] = stripReservedWords(change.body);
    }//if
  }//else

  _certifications = getCertifications(change);

  if (_certifications.length > 0) {
    triggerOSCWebhook(_certifications);
  }
}//manageChanges

/**
 * Watches the ASNs endpoint and calls the manageChanges function
 */
async function watchASNs() {
  console.log("--> Watching ASNs endpoint for changes.");
  const requestId = await OADA.watch({
    path: PATH,
    watchCallback: (change: any) => {
      if (change.type === "merge" && change.path.length > "/day-index/YYYY-MM-DD/".length) {
        manageChanges(change);
      }
    }
  })
}

// starting watching for changes in the ASNs
try {
  watchASNs();
} catch (error) {
  console.log("--> Error: ", error);
}



