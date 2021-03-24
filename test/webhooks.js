import _ from "lodash";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import oada from "@oada/client";
import Promise from "bluebird";
import moment from "moment";
import debug from "debug";

const trace = debug('osc-webhooks#test:trace');
const info = debug('osc-webhooks#test:info');
const error = debug('osc-webhooks#test:error');

const PATH = "/bookmarks/trellisfw/asns";
let con = false; // set with setConnection function
let _target = "osc-webhook";
const day = moment().format('YYYY-MM-DD');
chai.use(chaiAsPromised);
const expect = chai.expect;

import config from "../scr/config.js";
const domain = 'dev.trellis.one';
const TOKEN = config.get('token');
const format_YYYYMMDD = "YYYY-MM-DD";

const tree = {
  bookmarks: {
    _type: "application/vnd.oada.bookmarks.1+json",
    trellisfw: {
      _type: "application/vnd.trellisfw.1+json",
      asns: {
        _type: "application/vnd.trellisfw.asns.1+json",
        'day-index': {
          '*': {
            _type: "application/vnd.trellisfw.asns.1+json",
            _rev: 0,
            '*': {
              _type: "application/vnd.trellisfw.asn.porkhack.1+json",
              _rev: 0
            }
          }
        }
      }
    }
  }
};

let pac_template = {
  pac_id: "pac_id",
  hash: "",
  result: "valid"
};


let asn_template = {
  id: "asn-osc-pac",
  ship_date: "2021-03-26",
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
        pac: pac_template
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
        certification_id: "4444444444445",
        pac: pac_template
      }
    }
  }
};

let asn_template_schema = {
  id: "asn-osc-pac2",
  shipdate: "2021-03-26",
  status: "arrived",

  scheduled: {
    shipfromlocation: {
      name: "West Barn",
      premiseid: "1939842",
      address: "Address",
    },
  },

  enroute: {
    head: { value: 200, units: "count" },
    weight: { value: 49000, units: "lbs" },
    locations: {
      '208eifojfe': { time: 123984934.43, lat: 50.1984, lon: -81.83495 },
    },
    departuretime: 9023029431.0394,
    arrivaltime: 1893083093.439,
  },

  arrived: {
    arrivaltime: 190849103423.934,
    head: { value: 199, units: "count" },
    weight: { value: 48500, units: "lbs" },
  },

  farmer: {
    name: "Ault Farms, Inc.",
    certifications: {
      "02jkfjf0i2ofk": {
        certtype: "PQA-PLUS",
        expiration: "2022-04-20",
        certificationid: "9381923834"
      }
    },
    processorid: "internal_farmerid_for_processor",
    haulerid: "internal_farmrerid_for_hauler",
  },
  hauler: {
    name: "Hauler, Inc.",
    address: "the address",

    certifications: {
      "902u390r2j3iof": {
        certtype: "TQA",
        expiration: "2022-04-25",
        certificationid: "2890183410942",
        pac: {
          pacid: "ijd20fijedlkfj",
          result: "valid"
        }
      }
    },
    processorid: "internal_hauler_id_1",
    farmerid: "internal_hauler_id_2",
  },
  processor: {
    name: "Processor, Inc.",
    certifications: {
      "certification-random-string": {
        certtype: "TQA",
        expiration: "2022-04-25",
        certificationid: "444444444444",
        pac: {
          pacid: "pacid",
          result: "valid"
        }
      }
    },
    farmerid: "internal_processor_id_1",
    haulerid: "internal_processor_id_2",
  }
};

let asn_template_schema_no_certifications = {
  id: "asn-osc-pac2",
  shipdate: "2021-03-26",
  status: "arrived",

  scheduled: {
    shipfromlocation: {
      name: "West Barn",
      premiseid: "1939842",
      address: "Address",
    },
  },

  enroute: {
    head: { value: 200, units: "count" },
    weight: { value: 49000, units: "lbs" },
    locations: {
      '208eifojfe': { time: 123984934.43, lat: 50.1984, lon: -81.83495 },
    },
    departuretime: 9023029431.0394,
    arrivaltime: 1893083093.439,
  },

  arrived: {
    arrivaltime: 190849103423.934,
    head: { value: 199, units: "count" },
    weight: { value: 48500, units: "lbs" },
  },

  farmer: {
    name: "Ault Farms, Inc.",
    certifications: {
    },
    processorid: "internal_farmerid_for_processor",
    haulerid: "internal_farmrerid_for_hauler",
  },
  hauler: {
    name: "Hauler, Inc.",
    address: "the address",

    certifications: {
    },
    processorid: "internal_hauler_id_1",
    farmerid: "internal_hauler_id_2",
  },
  processor: {
    name: "Processor, Inc.",
    certifications: {
    },
    farmerid: "internal_processor_id_1",
    haulerid: "internal_processor_id_2",
  }
};

let add_farmer_certification_template = {
  certifications: {
    "02jkfjf0i2ofk": {
      certtype: "PQA-PLUS",
      expiration: "2022-04-20",
      certificationid: "9381923834"
    }
  }
};

let add_hauler_certification_template = {
  certifications: {
    "902u390r2j3iof": {
      certtype: "TQA",
      expiration: "2022-04-25",
      certificationid: "2890183410942"
    }
  }
};

let add_processor_certification_template = {
  certifications: {
    "certification-random-string": {
      certtype: "TQA",
      expiration: "2022-04-25",
      certificationid: "444444444444",
    }
  }
};

let date = new Date();
let current_date = moment(date).format(format_YYYYMMDD);


async function cleanUp(OADA) {
  let _path = PATH + `/day-index/${current_date}/${asn_template.id}`;
  let _path2 = PATH + `/day-index/${current_date}/${asn_template.id}2`;
  let _asn = await OADA.delete({
    path: _path
  }).then((result) => {
    console.log("--> asn deleted. ", result);
  }).catch((error) => {
    console.log("--> error when deleting an asn ", error);
  });

  let _asn2 = await OADA.delete({
    path: _path2
  }).then((result) => {
    console.log("--> asn deleted. ", result);
  }).catch((error) => {
    console.log("--> error when deleting an asn ", error);
  });
}//cleanUp

/**
 * 
 * @param key_or_keys 
 * @param merges 
 */
async function putData(OADA) {
  let _data = _.cloneDeep(asn_template_schema);
  let _data2 = _.cloneDeep(asn_template_schema_no_certifications);

  //let _data = { ship_date: "2021-03-26" };
  let _path = PATH + `/day-index/${current_date}/${asn_template.id}`;
  let _path2 = PATH + `/day-index/${current_date}/${asn_template.id}2`;
  let _asn = await OADA.put({
    path: _path,
    tree: tree,
    data: _data
  }).then((result) => {
    console.log("--> asn created. ", result);
  }).catch((error) => {
    console.log("--> error when creating an asn ", error);
  });

  let _asn2 = await OADA.put({
    path: _path2,
    tree: tree,
    data: _data2
  }).then((result) => {
    console.log("--> asn created. ", result);
  }).catch((error) => {
    console.log("--> error when creating an asn ", error);
  });
}//putData


process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
describe('success job', () => {

  before(async function () {
    this.timeout(20000);
    con = await oada.connect({ domain, TOKEN });
    await cleanUp(con);
    await putData(con);
  });

  // Wait a bit for processing all the jobs
  //if (REALISTIC_TIMING) await Promise.delay(2000);

  it("should create the asn", async () => {
    let _path = PATH + `/day-index/${current_date}/${asn_template_schema_no_certifications.id}`;
    const result = await con.get({ path: _path }).then(r => r.data);
    expect(result).to.have.property("shipdate");
    expect(result).to.have.property("status");
  });

  it("should put the farmer certifications ", async () => {
    let _path = PATH + `/day-index/${current_date}/${asn_template_schema_no_certifications.id}/farmer`;
    const result = await con.put({ path: _path, data: add_farmer_certification_template }).then(r => r);
    expect(result.status).to.equal(200);
  });

  it("should put the hauler certifications ", async () => {
    let _path = PATH + `/day-index/${current_date}/${asn_template_schema_no_certifications.id}/hauler`;
    const result = await con.put({ path: _path, data: add_hauler_certification_template }).then(r => r);
    expect(result.status).to.equal(200);
  });

  it("should put the processor certifications ", async () => {
    let _path = PATH + `/day-index/${current_date}/${asn_template_schema_no_certifications.id}/processor`;
    const result = await con.put({ path: _path, data: add_processor_certification_template }).then(r => r);
    // console.log("--> certifications farmer ", add_farmer_certification_template);
    // console.log("--> result ", JSON.stringify(result));
    // console.log("--> path ", _path);
    expect(result.status).to.equal(200);
  });

});

process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', error);
});


