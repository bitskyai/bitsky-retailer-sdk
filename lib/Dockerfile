FROM mhart/alpine-node:12

LABEL maintainer="Munew docker maintainers <help.munewio@gmail.com>"

# create app directory
WORKDIR /usr/exampleblog

# Bundle app source
COPY . .

# Only install production dependencies
RUN yarn --production=true

EXPOSE 3000
CMD ["node", "./bin/www"]

# Metadata
LABEL munew.image.vendor="Munew" \
    munew.image.url="https://munew.io" \
    munew.image.title="Example Analyst Service" \
    munew.image.description="An example Analyst Service to crawl all article from https://exampleblog.munew.io" \
    munew.image.documentation="https://docs.munew.io"