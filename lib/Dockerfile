FROM mhart/alpine-node:12

LABEL maintainer="BitSky docker maintainers <help.bitskyai@gmail.com>"

# create app directory
WORKDIR /usr/exampleblog

# Bundle app source
COPY . .

# Only install production dependencies
RUN npm ci --only=production

EXPOSE 3000
CMD ["node", "./bin/www"]

# Metadata
LABEL bitsky.image.vendor="BitSky" \
    bitsky.image.url="https://bitsky.ai" \
    bitsky.image.title="Example Analyst Service" \
    bitsky.image.description="An example Analyst Service to crawl all article from https://exampleblog.bitsky.ai" \
    bitsky.image.documentation="https://docs.bitsky.ai"
