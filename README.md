# Seismic Data Analysis Platform

A comprehensive web-based platform for seismic data analysis, featuring multiple specialized applications for picks analysis, dispersion curve modeling, and data visualization.

## 🏗️ Architecture

This project consists of multiple interconnected components:

- **Backend** (`backend/`) - FastAPI-based REST API server
- **Frontend** (`frontend/`) - Main React application with Redux state management
- **Pick Page** (`pick-page/`) - Specialized React app for seismic pick analysis
- **Disper Page** (`disper-page/`) - Dispersion curve modeling application

## 🚀 Features

### Main Frontend Application
- **Interactive Data Visualization** using PixiJS and React
- **Drag & Drop Interface** with @dnd-kit for data manipulation
- **Excel/CSV Import** for geometry and seismic data
- **Real-time Plotting** with customizable axis limits
- **Project Management** with persistent storage
- **Bootstrap UI** with responsive design

### Pick Analysis (`pick-page/`)
- **NPY File Processing** for numerical data arrays
- **Interactive Plotting** with PixiJS integration
- **Tailwind CSS** styling for modern UI
- **Real-time Data Visualization**

### Dispersion Modeling (`disper-page/`)
- **Layer-based Velocity Models**
- **Curve Fitting and Analysis**
- **Interactive Model Editing**
- **Export/Import Functionality**

### Backend API
- **FastAPI** with automatic OpenAPI documentation
- **File Upload Handling** for Excel, NPY, and text formats
- **CORS Support** for cross-origin requests
- **Project-based Data Management**
- **Geometry Extraction** from spreadsheets

## 🛠️ Technology Stack

### Frontend Technologies
- **React 19** with TypeScript
- **Redux Toolkit** for state management
- **PixiJS** for high-performance 2D graphics
- **Bootstrap 5** / **Tailwind CSS** for styling
- **Vite** for fast development and building
- **Axios** for API communication

### Backend Technologies
- **FastAPI** with Python
- **NumPy** for numerical computations
- **Pandas** for data manipulation
- **OpenPyXL** for Excel file processing
- **SEGY-IO** for seismic data formats
- **Pydantic** for data validation

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.8+
- Git

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Applications
```bash
# Main frontend
cd frontend
npm install
npm run dev

# Pick analysis page
cd pick-page
npm install
npm run dev

# Dispersion modeling page
cd disper-page
npm install
npm run dev
```

## 🔧 Development

### Project Structure
```
spark-collab/
├── backend/           # FastAPI server
│   ├── main.py       # API endpoints
│   └── requirements.txt
├── frontend/         # Main React app
│   ├── src/
│   │   ├── features/ # Feature-based components
│   │   ├── services/ # API integration
│   │   └── types/    # TypeScript definitions
│   └── package.json
├── pick-page/        # Pick analysis app
├── disper-page/      # Dispersion modeling app
└── docs/            # Documentation and samples
```

### Key Features Implementation
- **File Processing**: Supports Excel, CSV, NPY, and custom text formats
- **Real-time Visualization**: PixiJS integration for smooth graphics
- **State Management**: Redux for complex application state
- **API Integration**: RESTful endpoints with proper error handling
- **Responsive Design**: Mobile-friendly interfaces

### Data Formats Supported
- **Geometry Data**: Excel/CSV with X, Y, Z coordinates
- **Seismic Picks**: Custom text format with frequency/slowness data
- **NumPy Arrays**: Binary .npy files for large datasets
- **Layer Models**: Text-based velocity/density profiles

## 🧪 API Endpoints

Key backend endpoints:
- `POST /extractExcel` - Process geometry from Excel files
- `GET /project/{id}/grids` - Retrieve project grid data
- `POST /project/{id}/options` - Save project configuration
- `GET /project/{id}/disper-settings` - Dispersion model settings

## 📊 Data Processing

The platform handles various seismic data types:
- **Geometry coordinates** with elevation data
- **Frequency-slowness picks** for dispersion analysis
- **Velocity models** with layered earth structures
- **Grid data** for visualization and analysis

## 🤝 Contributing

This is a collaborative project with @Spark. Please follow the established patterns for:
- Component structure and naming
- State management with Redux
- API endpoint design
- TypeScript type definitions

## 📄 License

Private collaboration repository.

