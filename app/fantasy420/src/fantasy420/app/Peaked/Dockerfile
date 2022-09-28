FROM debian:11

RUN apt-get update
RUN apt-get install -y software-properties-common

RUN apt install -y python3.9
RUN apt install -y python3-pip

RUN pip3 install  --upgrade pip

RUN pip3 install pytesseract

COPY . ./

ENTRYPOINT python3 generate.py
