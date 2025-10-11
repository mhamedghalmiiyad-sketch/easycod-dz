// A list of Algerian Wilayas (provinces) with their codes and names in Arabic and French.


// API functions for various delivery companies.
export const deliveryApis = {
  // Noest API requires a token and user GUID for its requests.
   zrexpress: {
    getDeliveryFees: async (apiToken: string, apiKey: string) => {
      try {
        const response = await fetch('https://procolis.com/api_v1/tarification', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'token': apiToken,
            'key': apiKey
          }
        });
        return await response.json();
      } catch (error) {
        console.error('ZR Express API Error:', error);
        return null;
      }
    }
  },

  // COLIRELI/Procolis API (same structure as ZR Express based on your info)
  procolis: {
    getDeliveryFees: async (apiToken: string, apiKey: string) => {
      try {
        const response = await fetch('https://procolis.com/api_v1/tarification', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'token': apiToken,
            'key': apiKey
          }
        });
        return await response.json();
      } catch (error) {
        console.error('COLIRELI/Procolis API Error:', error);
        return null;
      }
    }
  },
  noest: {
    getDeliveryFees: async (apiToken: string, userGuid: string) => {
      try {
        const response = await fetch('https://app.noest-dz.com/api/public/fees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_token: apiToken, user_guid: userGuid })
        });
        return await response.json();
      } catch (error) {
        console.error('Noest API Error:', error);
        return null;
      }
    },
    getStopDesks: async (apiToken: string, userGuid: string) => {
      try {
        const response = await fetch('https://app.noest-dz.com/api/public/desks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_token: apiToken, user_guid: userGuid })
        });
        return await response.json();
      } catch (error) {
        console.error('Noest Desks API Error:', error);
        return null;
      }
    }
  },
  
  // EcoTrack and similar APIs fetch fees from a standard endpoint.
  ecotrack: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('EcoTrack API Error:', error);
        return null;
      }
    }
  },

  // DHD uses the same API structure as EcoTrack.
  dhd: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('DHD API Error:', error);
        return null;
      }
    }
  },

  // Anderson uses the same API structure as EcoTrack.
  anderson: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Anderson API Error:', error);
        return null;
      }
    }
  },

  // Areex uses the same API structure as EcoTrack.
  areex: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Areex API Error:', error);
        return null;
      }
    }
  },

  // BA Consult uses the same API structure as EcoTrack.
  baconsult: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('BA Consult API Error:', error);
        return null;
      }
    }
  },

  // Conexlog uses the same API structure as EcoTrack.
  conexlog: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Conexlog API Error:', error);
        return null;
      }
    }
  },

  // Coyote Express uses the same API structure as EcoTrack.
  coyoteexpress: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Coyote Express API Error:', error);
        return null;
      }
    }
  },

  // Distazero uses the same API structure as EcoTrack.
  distazero: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Distazero API Error:', error);
        return null;
      }
    }
  },

  // 48Hr Livraison uses the same API structure as EcoTrack.
  '48hr': {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('48Hr Livraison API Error:', error);
        return null;
      }
    }
  },

  // FRET.Direct uses the same API structure as EcoTrack.
  fretdirect: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('FRET.Direct API Error:', error);
        return null;
      }
    }
  },

  // GOLIVRI uses the same API structure as EcoTrack.
  golivri: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('GOLIVRI API Error:', error);
        return null;
      }
    }
  },

  // MSM Go uses the same API structure as EcoTrack.
  msmgo: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('MSM Go API Error:', error);
        return null;
      }
    }
  },

  // Packers uses the same API structure as EcoTrack.
  packers: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Packers API Error:', error);
        return null;
      }
    }
  },

  // Prest uses the same API structure as EcoTrack.
  prest: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Prest API Error:', error);
        return null;
      }
    }
  },

  // Rex Livraison uses the same API structure as EcoTrack.
  rex: {
    getDeliveryFees: async (apiUrl:string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Rex Livraison API Error:', error);
        return null;
      }
    }
  },

  // Rocket Delivery uses the same API structure as EcoTrack.
  rocket: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Rocket Delivery API Error:', error);
        return null;
      }
    }
  },

  // Salva Delivery uses the same API structure as EcoTrack.
  salva: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Salva Delivery API Error:', error);
        return null;
      }
    }
  },

  // Speed Delivery uses the same API structure as EcoTrack.
  speed: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('Speed Delivery API Error:', error);
        return null;
      }
    }
  },

  // TSL Express uses the same API structure as EcoTrack.
  tsl: {
    getDeliveryFees: async (apiUrl: string) => {
      try {
        const response = await fetch(`${apiUrl}/api/v1/get/fees`);
        return await response.json();
      } catch (error) {
        console.error('TSL Express API Error:', error);
        return null;
      }
    }
  }
};
