FROM debian:11

RUN apt-get update
RUN apt-get install -y software-properties-common

RUN apt install -y python3.9
RUN apt install -y python3-pip

RUN pip3 install  --upgrade pip

RUN pip3 install requests
RUN pip3 install numpy

RUN pip3 install opencv-python
RUN pip3 install pytesseract

RUN apt install -y tesseract-ocr

RUN apt-get install ffmpeg libsm6 libxext6  -y

RUN pip3 install pydantic

COPY . ./

ENTRYPOINT python3 generate.py
