docker_wait_for_service() {
    if [ $# -ne "2" ]
    then
        echo "USAGE: MUST PROVIDE 2 PARAMETER (URL and timeout in seconds)";
        return 1
    fi

    local url="$1"
    local timeOutInSeconds="$2"

    echo "WAITING FOR SERVICE AT $url"

    local startTimeInSeconds=$(date +%s)

    until $(curl -k --output /dev/null --silent --head --fail $url); do
        local nowInSeconds=$(date +%s)
        local elapsedTimeInSeconds=$((nowInSeconds - startTimeInSeconds))
        if [ "$elapsedTimeInSeconds" -ge "$timeOutInSeconds" ]
        then
            echo "SERVICE NOT DETECTED WITHIN TIMEOUT OF $timeOutInSeconds SECONDS"
            return 1
        fi
        printf '.'
        sleep 1
    done
    echo "SERVICE DETECTED"
}