// Map of pincodes to their respective zones and areas
const pincodeData = {
    // Bangalore North
    '560001': {
        zones: ['North Central', 'North West'],
        areas: ['Majestic', 'Malleswaram'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    '560003': {
        zones: ['North East', 'North'],
        areas: ['Frazer Town', 'Cox Town'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    // Bangalore South
    '560004': {
        zones: ['South Central', 'South East'],
        areas: ['Jayanagar', 'BTM Layout'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    '560011': {
        zones: ['South West', 'South'],
        areas: ['Banashankari', 'JP Nagar'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    // Bangalore East
    '560008': {
        zones: ['East Central', 'East'],
        areas: ['Indiranagar', 'CV Raman Nagar'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    '560017': {
        zones: ['East', 'North East'],
        areas: ['Whitefield', 'Marathahalli'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    // Bangalore West
    '560010': {
        zones: ['West Central', 'West'],
        areas: ['Rajajinagar', 'Vijayanagar'],
        district: 'Bangalore',
        state: 'Karnataka'
    },
    '560079': {
        zones: ['West', 'South West'],
        areas: ['Kengeri', 'RR Nagar'],
        district: 'Bangalore',
        state: 'Karnataka'
    }
};

// Function to get zones for a pincode
const getZonesForPincode = (pincode) => {
    if (!pincodeData[pincode]) {
        throw new Error('Invalid pincode');
    }
    return pincodeData[pincode].zones;
};

// Function to get areas for a pincode
const getAreasForPincode = (pincode) => {
    if (!pincodeData[pincode]) {
        throw new Error('Invalid pincode');
    }
    return pincodeData[pincode].areas;
};

// Function to get district and state for a pincode
const getLocationForPincode = (pincode) => {
    if (!pincodeData[pincode]) {
        throw new Error('Invalid pincode');
    }
    return {
        district: pincodeData[pincode].district,
        state: pincodeData[pincode].state
    };
};

// Function to validate if a pincode exists
const isPincodeValid = (pincode) => {
    return !!pincodeData[pincode];
};

// Function to get all data for a pincode
const getPincodeData = (pincode) => {
    if (!pincodeData[pincode]) {
        throw new Error('Invalid pincode');
    }
    return pincodeData[pincode];
};

export {
    getZonesForPincode,
    getAreasForPincode,
    getLocationForPincode,
    isPincodeValid,
    getPincodeData,
    pincodeData
};
