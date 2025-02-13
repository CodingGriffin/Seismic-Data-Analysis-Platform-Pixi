import io
import logging
import os
import tempfile
from time import sleep

import aiofiles
import aiofiles.os as aios

from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.utils import close_and_remove_file, get_sheets_from_excel
from utils import get_geometry_from_excel

app = FastAPI()
CHUNK_SIZE = 1024 * 1024  # adjust the chunk size as desired

origins = [
    "http://localhost:*",
    # Adjust the port if your frontend runs on a different one
    # "https://yourfrontenddomain.com",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # origins,  # Allows all origins from the list
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    exc_str = f'{exc}'.replace('\n', ' ').replace('   ', ' ')
    logging.error(f"{request}: {exc_str}")
    content = {'status_code': 10422, 'message': exc_str, 'data': None}
    return JSONResponse(content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.post("/extractExcel")
async def get_elevation_from_excel_endpoint(
        background_tasks: BackgroundTasks,
        excel_file: UploadFile = File(...),
):
    file_name = excel_file.filename
    split = file_name.split('.')
    if len(split) <= 1:
        raise HTTPException(400, "No file extension found.")
    extension = "." + file_name.split('.')[-1]
    try:
        fd, path = tempfile.mkstemp(suffix=extension)
        async with aiofiles.open(path, 'wb') as f:
            while chunk := await excel_file.read(CHUNK_SIZE):
                await f.write(chunk)
            os.close(fd)
            await f.flush()
            await f.close()
        with open(path, 'rb') as f:
            buffer = io.BytesIO(f.read())
            geometry_list = get_geometry_from_excel(buffer)
        background_tasks.add_task(close_and_remove_file(path))

    except Exception as e:
        print(e)
        raise HTTPException(400, "Failed to parse excel file.")
    return geometry_list

@app.post("extractExcelSheets")
async def get_sheets_from_excel_endpoint(
        background_tasks: BackgroundTasks,
        excel_file: UploadFile = File(...),
):
    file_name = excel_file.filename
    split = file_name.split('.')
    if len(split) <= 1:
        raise HTTPException(400, "No file extension found.")
    extension = "." + file_name.split('.')[-1]
    try:
        fd, path = tempfile.mkstemp(suffix=extension)
        async with aiofiles.open(path, 'wb') as f:
            while chunk := await excel_file.read(CHUNK_SIZE):
                await f.write(chunk)
            os.close(fd)
            await f.flush()
            await f.close()
        with open(path, 'rb') as f:
            buffer = io.BytesIO(f.read())
            sheets_list = get_sheets_from_excel(buffer)
        background_tasks.add_task(close_and_remove_file(path))

    except Exception as e:
        print(e)
        raise HTTPException(400, "Failed to parse excel file.")
    return sheets_list