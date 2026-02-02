const axios = require('axios');

const UNSPLASH_API_URL = 'https://api.unsplash.com';
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/**
 * Fetch images from Unsplash based on a search query
 * @param {string} query - Search term
 * @param {number} perPage - Number of images to fetch (default: 1)
 * @returns {Promise<Array>} - Array of image objects
 */
const fetchImages = async (query, perPage = 1) => {
  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/search/photos`, {
      params: {
        query,
        per_page: perPage,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': `Client-ID ${ACCESS_KEY}`
      }
    });

    return response.data.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnail: photo.urls.small,
      description: photo.description || photo.alt_description,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      downloadUrl: photo.links.download_location
    }));
  } catch (error) {
    console.error('Error fetching images from Unsplash:', error.message);
    return [];
  }
};

/**
 * Get a random photo from Unsplash based on a query
 * @param {string} query - Search term
 * @returns {Promise<Object>} - Image object
 */
const getRandomPhoto = async (query) => {
  try {
    const response = await axios.get(`${UNSPLASH_API_URL}/photos/random`, {
      params: {
        query,
        orientation: 'landscape'
      },
      headers: {
        'Authorization': `Client-ID ${ACCESS_KEY}`
      }
    });

    return {
      id: response.data.id,
      url: response.data.urls.regular,
      thumbnail: response.data.urls.small,
      description: response.data.description || response.data.alt_description,
      photographer: response.data.user.name,
      photographerUrl: response.data.user.links.html,
      downloadUrl: response.data.links.download_location
    };
  } catch (error) {
    console.error('Error fetching random photo from Unsplash:', error.message);
    return null;
  }
};

/**
 * Get predefined service images
 * @returns {Promise<Object>} - Object with service names as keys and image data as values
 */
const getServiceImages = async () => {
  const services = [
    { name: 'ai-haircut', query: 'AI haircut salon hair styling' },
    { name: 'tutor', query: 'private tutor teaching education' },
    { name: 'car-wash', query: 'car wash cleaning service' }
  ];

  const imagePromises = services.map(service => 
    getRandomPhoto(service.query).then(image => ({
      serviceName: service.name,
      image
    }))
  );

  const results = await Promise.all(imagePromises);
  
  return results.reduce((acc, { serviceName, image }) => {
    acc[serviceName] = image;
    return acc;
  }, {});
};

module.exports = {
  fetchImages,
  getRandomPhoto,
  getServiceImages
};
