# Unsplash API Integration for Flowgrid

This integration adds Unsplash images to your service booking application for AI Haircut, Private Tutor, and Car Wash services.

## Setup Instructions

### 1. Get Unsplash API Key

1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Sign up or log in to your account
3. Click "New Application"
4. Accept the API terms
5. Fill in the application details:
   - **Application name**: Flowgrid
   - **Description**: Service booking platform
6. Copy your **Access Key**

### 2. Configure Backend

1. Open `backend/.env` file
2. Replace the placeholder with your actual Unsplash Access Key:
   ```env
   UNSPLASH_ACCESS_KEY=your_actual_access_key_here
   ```

### 3. Install Dependencies

The integration requires the `axios` package. If not already installed:

```bash
cd backend
npm install axios
```

## API Endpoints

### Search Images

```
GET /api/unsplash/search?query=haircut&perPage=10
```

### Get Random Image

```
GET /api/unsplash/random?query=tutor
```

### Get Service Images (AI Haircut, Tutor, Car Wash)

```
GET /api/unsplash/service-images
```

## Usage in Frontend

### Using the ServiceCard Component

```jsx
import ServiceCard from "./components/ServiceCard";
import { servicesAPI } from "./services/api";

function MyComponent() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      const response = await servicesAPI.getAll();
      setServices(response.data);
    };
    fetchServices();
  }, []);

  const handleBook = (service) => {
    console.log("Booking service:", service);
  };

  return (
    <div className="service-cards-grid">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} onBook={handleBook} />
      ))}
    </div>
  );
}
```

### Using the API directly

```jsx
import { unsplashAPI } from "./services/api";

// Search for images
const searchImages = async () => {
  const response = await unsplashAPI.search("car wash", 5);
  console.log(response.data.data); // Array of images
};

// Get a random image
const getRandomImage = async () => {
  const response = await unsplashAPI.getRandom("AI haircut");
  console.log(response.data.data); // Single image object
};

// Get all service images
const getServiceImages = async () => {
  const response = await unsplashAPI.getServiceImages();
  console.log(response.data.data);
  // {
  //   'ai-haircut': { url, thumbnail, description, ... },
  //   'tutor': { url, thumbnail, description, ... },
  //   'car-wash': { url, thumbnail, description, ... }
  // }
};
```

## Features

- ✅ Fetches high-quality images from Unsplash
- ✅ Caches images for better performance
- ✅ Fallback placeholders for loading/error states
- ✅ Responsive service cards with images
- ✅ Three new services added to mockData:
  - AI Haircut (Beauty category)
  - Private Tutor (Education category)
  - Car Wash (Automotive category)

## File Structure

```
backend/
├── utils/
│   └── unsplash.js          # Unsplash API utility functions
├── routes/
│   └── unsplash.js          # API routes for Unsplash
├── data/
│   └── mockData.js          # Updated with new services
└── .env                      # Unsplash API key

frontend/
├── src/
│   ├── components/
│   │   └── ServiceCard.js   # Service card component with images
│   ├── services/
│   │   └── api.js           # Updated with Unsplash API calls
│   └── styles/
│       └── ServiceCard.css  # Service card styling
```

## Image Response Format

Each image object contains:

```javascript
{
  id: "abc123",                              // Unsplash photo ID
  url: "https://images.unsplash.com/...",   // Full resolution image
  thumbnail: "https://images.unsplash.com/...", // Small thumbnail
  description: "A person getting a haircut", // Image description
  photographer: "John Doe",                  // Photographer name
  photographerUrl: "https://unsplash.com/@johndoe", // Photographer profile
  downloadUrl: "https://api.unsplash.com/..." // Download tracking URL
}
```

## Notes

- Free tier allows 50 requests per hour
- Images are fetched fresh each time (you can add caching if needed)
- Make sure to comply with [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- Attribution to photographers is included in the response data

## Testing

1. Start the backend server:

   ```bash
   cd backend
   npm start
   ```

2. Test the endpoints:

   ```bash
   # Get service images
   curl http://localhost:5000/api/unsplash/service-images

   # Search for images
   curl "http://localhost:5000/api/unsplash/search?query=haircut&perPage=5"

   # Get random image
   curl "http://localhost:5000/api/unsplash/random?query=tutor"
   ```

3. Start the frontend:
   ```bash
   cd frontend
   npm start
   ```

## Troubleshooting

- **401 Unauthorized**: Check that your Unsplash Access Key is correct in `.env`
- **Rate limit exceeded**: Wait for the hour to reset or upgrade your Unsplash plan
- **Images not loading**: Check browser console for CORS errors and verify backend is running
