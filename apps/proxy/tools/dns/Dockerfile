FROM coredns/coredns:latest

COPY Corefile /Corefile

EXPOSE 53/udp

CMD ["-conf", "/Corefile"]
