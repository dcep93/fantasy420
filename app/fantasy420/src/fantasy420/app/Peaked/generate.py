import requests

import cv2
import numpy
import pytesseract

url = "https://i0.wp.com/peakedinhighskool.com/wp-content/uploads/2022/09/1QB1.0PPR4pt_20220927.png?w=1790&ssl=1"


def main():
    raw = requests.get(url).content
    data = numpy.frombuffer(raw, dtype='uint8')
    image = cv2.imdecode(data, cv2.IMREAD_GRAYSCALE)


if __name__ == "__main__":
    main()
