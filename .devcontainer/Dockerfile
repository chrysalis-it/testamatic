FROM devopsinfra/docker-terragrunt:aws-tf-1.4.5-tg-0.45.4

# Bind up and down cursor keys to incrementally search through the history
RUN echo '"\e[A": history-search-backward' >> /etc/inputrc && \
    echo '"\e[B": history-search-forward' >> /etc/inputrc

# Colouring bash
RUN echo 'PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> ~/.bashrc && \
    echo 'alias ls="ls --color=auto -h"' >> ~/.bashrc && \
    echo 'alias lsa="ls -lart --color=auto -h"' >> ~/.bashrc && \
    echo 'alias grep="grep --color=auto"' >> ~/.bashrc

# Install bash-completion
RUN apt-get update && \
    apt-get install -y --no-install-recommends bash-completion && \
    echo '[[ $PS1 && -f /usr/share/bash-completion/bash_completion ]] && . /usr/share/bash-completion/bash_completion' >> ~/.bashrc
