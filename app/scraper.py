"""Web scraping — fetch a page, strip noise, extract text + links."""
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}

NOISE_TAGS = ["script", "style", "img", "input", "nav", "footer"]


class Website:
    def __init__(self, url: str):
        self.url = url
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")

        self.title = (
            soup.title.string.strip()
            if soup.title and soup.title.string
            else "No title"
        )
        for tag in soup(NOISE_TAGS):
            tag.decompose()
        self.text = (
            soup.body.get_text(separator="\n", strip=True) if soup.body else ""
        )
        self.links = list({
            urljoin(url, a.get("href"))
            for a in soup.find_all("a")
            if a.get("href")
        })

    def contents(self) -> str:
        return f"Page: {self.title}\nURL: {self.url}\n\n{self.text}"
