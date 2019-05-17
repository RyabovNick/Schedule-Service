FROM node:10-alpine

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

# RUN mkdir -p /home/node/schedule_service && chown -R node:node /home/node/schedule_service

WORKDIR /home/node/schedule_service

# USER node

ADD . /home/node/schedule_service

RUN mkdir /home/node/schedule_service/logs
RUN chmod 755 /home/node/schedule_service/logs
RUN npm install pm2 -g

EXPOSE 3000

CMD [ "pm2-runtime", "index.js" ]