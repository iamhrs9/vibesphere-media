# VibeSphere Media

VibeSphere Media is a comprehensive web platform for a digital agency offering Instagram growth packages and web development services. This application handles user inquiries via an AI-powered chatbot, processes payments through Razorpay, manages orders, and features a blog and review system.

## Features

- **Service Packages**: Users can browse and purchase Instagram growth and web development packages.
- **AI Chatbot (VibeGenie)**: Integrated with Google Gemini 1.5 Flash to provide instant customer support and sales assistance in English, Hindi, and Hinglish.
- **Payment Gateway**: Secure payment processing using Razorpay.
- **Order Management**: Tracks orders and their status (stored in MongoDB).
- **Admin Panel**: Protected area for administrators to view and manage orders, blogs, and reviews.
- **Blog System**: Content management for blogs with multi-language support (English, Hindi, Hinglish).
- **Review System**: Allows customers to leave reviews and ratings.
- **Responsive Design**: Frontend served via static files in the `public` directory.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Payments**: Razorpay
- **AI**: Google Gemini API
- **Frontend**: HTML, CSS, JavaScript (Static files)

## Prerequisites

- Node.js (v18 or higher recommended)
- MongoDB instance (Atlas or local)
- Razorpay Account (Key ID and Key Secret)
- Google Gemini API Key

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd vibesphere-media
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add the following variables:

   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   ADMIN_PASSWORD=your_admin_password (Default: "admin123")
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   GEMINI_API_KEY=yournpm_gemini_api_key
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3000`.

## Project Structure

- `server.js`: Main application entry point containing API routes and server logic.
- `public/`: Contains static frontend files (HTML, CSS, JS, images).
- `orders.json`: JSON file (potentially for backup/legacy data).
- `package.json`: Project dependencies and scripts.

## API Endpoints

### General
- `GET /api/reviews`: Fetch customer reviews.
- `POST /api/add-review`: Add a new review.
- `POST /api/chat`: Interact with the AI chatbot.

### Blog
- `GET /api/blogs`: Get all blogs.
- `GET /api/blog/:slug`: Get a specific blog by slug.
- `GET /blog/:slug`: Serve the blog reading page.

### Payments & Orders
- `POST /api/create-payment`: Initiate a Razorpay payment order.
- `POST /api/verify-payment`: Verify payment signature and create an order.

### Admin (Requires Auth)
- `POST /api/login`: Admin login.
- `GET /api/admin/orders`: Fetch all orders.
- `POST /api/admin/update-status`: Update order status.
- `POST /api/add-blog`: Add a new blog post.
- `PUT /api/edit-blog/:id`: Edit an existing blog.
- `DELETE /api/delete-blog/:id`: Delete a blog.
- `DELETE /api/admin/delete-review/:id`: Delete a review.

## License

[Add License Information Here]
