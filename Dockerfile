FROM mongo:4.4

# Update and upgrade
RUN apt-get update && apt-get upgrade -y

# Install curl, supervisor, node
RUN apt-get install --fix-missing -y curl supervisor

RUN curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
RUN bash nodesource_setup.sh
RUN apt-get install nodejs

RUN npm install -global yarn

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY app/package.json app/yarn.lock /usr/src/app/
RUN yarn

# Copy app
COPY app /usr/src/app

# Setup supervisord
RUN mkdir -p /var/log/supervisor
COPY setup/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN /bin/rm -R /bin/bash /bin/sh

ENV SUPER_SECRET="You found flag_remote_code_execution"

EXPOSE 3000
CMD ["/usr/bin/supervisord"]
