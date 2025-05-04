import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { withRouter, NextRouter } from 'next/router';

interface ApiRequestInfo extends AxiosRequestConfig {
  router: NextRouter;
  sessionToken: string;
}

export const ApiRequest = async function <T>(props: ApiRequestInfo): Promise<AxiosResponse<T, any> | null> {
  const response = await axios<T>({
    ...props,
    headers: { ...props.headers, session: props.sessionToken },
  }).catch((error: AxiosError) => {
    if (error.response?.status === 401) {
      props.router.replace(`/signin`);
    }
  });
  if (response) {
    return response;
  } else {
    return null;
  }
};
