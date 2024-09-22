FROM nginx:latest
COPY ./index.html /usr/share/nginx/html/index.html
COPY ./index-bundle.js /usr/share/nginx/html/index-bundle.js
COPY ./viewer-bundle.js /usr/share/nginx/html/viewer-bundle.js
COPY ./tour-bundle.js /usr/share/nginx/html/tour-bundle.js