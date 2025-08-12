# Docker Build
- Building process involve a **buildx client** and a **buildkit backend**
- **buildx client** is where user invoke commands, when ``docker build`` is invoke, the request is sent to buildkit backend to build the Docker image.
- **buildkit backend** is daemon process that execute the  build workload. when ``build`` is invoked, Buildx interpreted the build instruction and sent to the backend. the request includes:
    - The Dockerfile
    - Build arguments
    - Export options
    - Caching options

- When **Buildkit** is executing, **buildx** monitor the build process, during that process, if some resources is needed (secret, keypair, local file...), **Buildkit** will request those resources from **Buildx**.

# Dockerfile 
- Instruction file to build the image.
- Docker image consist of layers, each layer is a ``build`` command of a dockerfile.
- a dockerfile must always start with a ``FROM`` instruction    
- Instructions is case-insensitive. All caps because everyone do dat shii
## Frequently used instruction
### FROM
- Declare a base image for dockerfile to be built on.
- In a docker file, there may exist multiple FROM command to build multiple images or use one as dependency for other.

### ARG
```dockerfile
ARG CODE_VERSION=latest
FROM base:${CODE_VERSION}
CMD /code/run-app
FROM extras:${CODE_VERSION}
CMD /code/run-extras
```
- ``ARG`` that declare before the first ``FROM`` can only be used by the ``FROM`` instruction, if instructions after ``FROM`` want to use the ``ARG``, it need to be declare again 

### RUN 
- RUN is used to fire commands
- There are 2 forms of RUN instructions:
    - **RUN <command> :** fire shell command, bash script
    - **RUN ["executable","param1","param2"]:** run an exe like node

### WORKDIR
- set the working directory for the RUN and CMD instructions to run on.
- multiple WORKDIR can appear in a dockerfile.
- if WORKDIR doesn't exist, it will be created

### COPY
```Dockerfile
COPY [OPTIONS] <src> ... <dest>
```
- If directory have whitespace, add the quotes
- Copies from ``<src>`` and adds them to the filesystem of the container at the path <dest>.
- The ``src`` can be refered from build context, build stage, named context, or an image.

```Dockerfile
COPY file1.txt file2.txt /usr/src/things/
```
- Can copy multiple files, the last args will be the destination. In this case, the destination must always be a directory(must end with a slash).

```Dockerfile
FROM golang AS build
WORKDIR /app
RUN --mount=type=bind,target=. go build -o /myapp ./cmd

COPY --from=build /myapp /usr/bin/
```

- The ``--from`` flag specify where you want to copy from, in the above example, it copy from the previous build stage.

- The ``../`` ain't gon work, for eg.
```Dockerfile
COPY ../something /something
```
will become
```Dockerfile
COPY something /something
```
- If the source is a dir, all contents inside will be copy to the dest, not the dir.
- File permission is preserved during copy.

```Dockerfile
# syntax=docker/dockerfile:1
FROM alpine AS build
COPY . .
RUN apk add clang
RUN clang -o /hello hello.c

FROM scratch
COPY --from=build /hello /
```

- above is how you use ``COPY`` in a multi-stage build.

#### COPY vs ADD
- ``COPY`` support basic copying file from the build context or multi-stage build.
- ``ADD`` support fetching file from HTTPS and Git url

```Dockerfile
FROM scratch AS src
ARG DOTNET_VERSION=8.0.0-preview.6.23329.7
ADD --checksum=sha256:270d731bd08040c6a3228115de1f74b91cf441c584139ff8f8f6503447cebdbb \
    https://dotnetcli.azureedge.net/dotnet/Runtime/$DOTNET_VERSION/dotnet-runtime-$DOTNET_VERSION-linux-arm64.tar.gz /dotnet.tar.gz

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0.0-preview.6-bookworm-slim-arm64v8 AS installer

# Retrieve .NET Runtime
RUN --mount=from=src,target=/src <<EOF
mkdir -p /dotnet
tar -oxzf /src/dotnet.tar.gz -C /dotnet
EOF

FROM mcr.microsoft.com/dotnet/runtime-deps:8.0.0-preview.6-bookworm-slim-arm64v8

COPY --from=installer /dotnet /usr/share/dotnet
RUN ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet
```
-Above is an example of using ADD

### EXPOSE
- Just simply give container a port in its runtime.

### ENV
```Dockerfile
ENV MY_NAME="John Doe"
ENV MY_DOG=Rex\ The\ Dog
ENV MY_CAT=fluffy
```
- ENV typpa shii iykyk.
- To view the ENVs you can use ``docker inspect``.
- ``docker run --env <key>=<value>`` can change ENV
- Stage inherits ENV from its ancestor stage
- Because the ENV persist, shit gon be messy if multiple building stages sitting on top of each other, to handle that, considering setting up env for only that building stage only. Using RUN or ARG
```Dockerfile
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y ...
OR
ARG DEBIAN_FRONTEND=noninteractive
```
### ENTRYPOINT
- Enable a container to run as a executable.
```Dockerfile
#exec form
ENTRYPOINT ["executable", "param1", "param2"]
#shell form
ENTRYPOINT command param1 param2
```

### CMD
- define the default program that is run when **image is start**. 
- Each Dockerfile has **ONLY ONE** CMD 
- **Only the last** CMD instance is respected when multiple exist.

```Dockerfile
#exec form
CMD ["executable","param1","param2"] 
#exec form, as default parameters to ENTRYPOINT
CMD ["param1","param2"]
#shell form
CMD command param1 param2 
```

### Confusion between CMD and ENTRYPOINT 
- If both execute command at image start, then why they keep both, i have no fuck clue.

- When image start, there are scenarios that CMD and ENTRYPOINT act differently.

- **CMD or ENTRYPOINT exist or none exist:** Do i need to explain?
- **Both CMD and ENTRYPOINT exist and ENTRYPOINT written in exec form:** Docker will concat ``ENTRYPOINT+CMD``, ENTRYPOINT will be the execution and CMD will be viewed as args. However, if user run docker image with inline args, CMD will be useless

# Building
## Multi-stage building 
- Multi-stage building is best practice for maintaining and readability
- Each FROM instruction create a new building stage, previous stage's artifact can be copied to subsequent stage
- Below is a example of a simple multi-stage for Go
```Dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.24 AS build
WORKDIR /src
COPY <<EOF ./main.go
# GO code goes here
EOF
RUN go build -o /bin/hello ./main.go
FROM scratch
COPY --from=build /bin/hello /bin/hello
CMD ["/bin/hello"]
```
- When you done with Dockerfile, simply run ``docker build -t Hello .``

### Stop at a stage
- These are some scenarios where this techniques is useful:
    - Debugging a stage 
    - Have seperated stages for ``debug``, ``production``, ``testing``.
    
