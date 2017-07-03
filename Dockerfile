# Copyright 2016, EMC, Inc.

FROM rackhd/on-core:devel

COPY . /RackHD/on-tasks/

RUN cd /RackHD/on-tasks \
  && mkdir -p /RackHD/on-tasks/node_modules \
  && ln -s /RackHD/on-core /RackHD/on-tasks/node_modules/on-core \
  && ln -s /RackHD/on-core/node_modules/di /RackHD/on-tasks/node_modules/di \
  && npm install --ignore-scripts --production \
  && apt-get update \
  && apt-get install -y apt-utils ipmitool openipmi
