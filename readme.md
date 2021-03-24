
# Oblivous Smart Contracts Webhooks Service
The osc-webhook service integrates AGAPECert framework with Trellis and OADA. This service utilizes webhooks and connects to serverless functions via REST requests.

The OSC-Serverless Function will generate a PAC according to the content of the certification provided by the entity, e.g., a farmer, a hauler, or processor.


> **Oblivous Smart Contracts Webhooks Service - Features**
> This service relies in the OADA API and Axios (to connect to the Azure Serverless Functions). The following a summarized loist of features provided by this service:

> 1. Determines the semantic to trigger webhooks that can call OSCs to generate PACs (Private Automated Certifications).
> 2. Filters the change feed to select only the changes that need a new PAC generated.
> 3. Diminishes the amount of requests to the Serverless Functions.
> 4. Retrieves a valid/invalid PAC.

## Oblivous Smart Contracts Webhooks Service - Algorithm Generator
We designed an algorithm generator. We can call individual pieces of certified code according to the requester characteristics (farmer, hauler, or processor.) The initial PoC calls the same OSC for all entities.
